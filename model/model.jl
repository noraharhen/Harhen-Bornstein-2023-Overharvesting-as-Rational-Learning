using CSV
using DataFrames
using Random, Distributions
using JLD
using Statistics
using StatsBase

include("./particle_filter.jl")
include("./model_struct.jl")
include("./opt.jl")

#################### MODEL HELPER FUNCTIONS ########################################

function tally(zd,K)
    ret = zeros(Int64, K)
    for k in zd
        ret[k] += 1
    end
    return ret
end

function calc_posterior(decay_list, N, alpha, particle_filter)
    num_particles = length(particle_filter)
    posterior = [[] for i = 1:num_particles]
    for p in 1:num_particles
        # 1. get log prior
        log_prior = log_prior_particle(particle_filter[p],N,alpha)
        # 2. get log likelihood
        log_like = log_likelihood_particle(particle_filter[p],decay_list)
        # 3. combine to get posterior
        post = exp.(log_prior .+ log_like)

        post_norm = post/sum(post)
        posterior[p] = post_norm
    end
    return posterior
end


function prob_cluster(curr_reward, decay_list, N, alpha, particle_filter)
    if (N == 0) | (length(decay_list) == 0)
        return prior(particle_filter, N , alpha)
    else
        return calc_posterior(decay_list, N, alpha, particle_filter)
    end
end


function sample_v_stay(particle_filter,weights, prob_k, n_samples, data)
    values = zeros(n_samples)
    all_clus = zeros(n_samples)

    for s in 1:n_samples
        # 1. sample a particle
        cum_weight = cumsum(weights)
        sampled_particle = argmax(rand() .< cum_weight) # try another way to make sure it works

        # 2. sample a cluster
        cum_particle_post = cumsum(prob_k[sampled_particle])
        cluster = argmax(rand() .< cum_particle_post) # try another way to make sure it works
        all_clus[s] = cluster

        # 3. sample from the distribution associated with this particle's cluster that was sampled
        if cluster > length(particle_filter[sampled_particle].cluster_mean)
            # create a new partilce just for the purpose of getting mu and sigma
            mu = particle_filter[sampled_particle].hyper_mu
            sigma = particle_filter[sampled_particle].hyper_var^(1/2)
        else
            # might want to conform expectation to  the data
            mu = particle_filter[sampled_particle].cluster_mean[cluster]
            sigma = particle_filter[sampled_particle].cluster_variance[cluster]^(1/2)
        end

        d = Normal(mu,sigma)
        sampled_value = rand(d)
        values[s] = sampled_value
        #state_visits[s] = particle_filter[sampled_particle].cluster_counts[cluster]
    end
    return values, all_clus
end




function get_galaxy(block_num, planet_num)
    exp_struc = DataFrame(CSV.File("exp_struc.csv",delim=','))

    tmp_1 = exp_struc[in(block_num).(exp_struc.block),:]

    tmp_2 = tmp_1[in(planet_num).(tmp_1.planet),:]

    galaxy = tmp_2.galaxy[1]

    return galaxy
end


function get_planet(block_num, block_tracker,data)
    last_planet = maximum(data.planet_in_block)

    if block_tracker.planet > last_planet
        curr_planet = DataFrame(sub_num = Int64[], block = Int64[],true_planet = Int64[], planet = Int64[],
            galaxy = Int64[], stay_num = Int64[], reward = Int64[])
        galaxy = get_galaxy(block_num,block_tracker.planet)
        p_tracker = Planet_Tracker(true,galaxy,0,0,(block_num-1)*20 + block_tracker.planet,[],[])

    else
        curr_planet = data[in(block_tracker.planet).(data.planet_in_block),:]
        galaxy = curr_planet.galaxy[1]
        p_tracker = Planet_Tracker(true,galaxy,0,0,(block_num-1)*20 + block_tracker.planet,[],[])
    end
    return curr_planet, p_tracker
end


function sample_decay(galaxy)
    if galaxy == 0
        a = 13
        b = 51
    elseif galaxy == 1
        a = 50
        b = 50
    elseif galaxy == 2
        a = 50
        b = 12
    end
    d = Beta(a,b)
    return rand(d)
end

function get_rho0()
    d = Normal(100,5)
    return rand(d)
end


function get_reward(planet_tracker, total_reward, data)
    # check if empty dataframe
    if (size(data.stay_num)[1] == 0)
        if planet_tracker.prt == 0
            last_reward = get_rho0()
            reward = round(last_reward)
        else
            last_reward = planet_tracker.curr_reward
            decay = sample_decay(planet_tracker.galaxy)
            reward = round(last_reward*decay)
        end
    else
        max_prt =  maximum(data.stay_num)
        if planet_tracker.prt > max_prt
             decay = sample_decay(planet_tracker.galaxy)
             reward = round(planet_tracker.curr_reward*decay)
         else
             # get the experienced reward
             reward = data[in(planet_tracker.prt).(data.stay_num),:].reward[1]
             decay = reward/planet_tracker.curr_reward
         end

    end

    if planet_tracker.prt > 0
        append!(planet_tracker.decay_list,decay)
    end

    planet_tracker.curr_reward = reward
    append!(planet_tracker.reward_list,reward)
    total_reward += reward
    return planet_tracker, total_reward
end


function make_choice_draw(p_stay,planet_tracker)
    stay = rand(Bernoulli(p_stay))

    if stay
        planet_tracker.on_planet = true
    else
        planet_tracker.on_planet = false
    end
    planet_tracker.prt += 1 # need to add one to counteract the first dig even if leave
    return planet_tracker
end



function make_choice_max(v_stay, v_leave, planet_tracker)
    if v_stay > v_leave
        planet_tracker.on_planet = true
    else
        planet_tracker.on_planet = false
    end
    planet_tracker.prt += 1 # need to add one to counteract the first dig even if leave
    return planet_tracker
end


function update_behavior(behav, planet_tracker)
    append!(behav.true_planet,planet_tracker.true_planet)
    append!(behav.galaxy,planet_tracker.galaxy)
    append!(behav.prt,planet_tracker.prt)
    append!(behav.reward_list,[planet_tracker.reward_list])
    return behav
end
#############################   MODEL  ######################################


function crp_adaptiveDiscount(data,params,num_particles)
    # intialize the exp
    expt = Experiment(5,360,20,2,10,5.5,1.5)
    behav = Behavior([],[],[],[])

    # initialize the particle filter
    alpha = params[1]
    gamma_base = params[2]
    gamma_coef = params[3]
    #println(params)
    hyper_mu = 0.5
    hyper_var = 0.25
    hyper_tau = 1
    n_samples = 100
    particles, weights = init_particle_filter(num_particles,hyper_mu, hyper_var, hyper_tau, alpha)

    # initialize for tracking progress through the exp
    total_reward = 0
    total_time = expt.alien_time + expt.iti
    N = 0 # all planets experienced, ***check if changes if I change to number of decay rates ***
    n_cluster_inferred = []
    gammas = []
    pred_decay = []
    uncertainty=[]
    true_decay=[]
    middle = []
    middle_decay = []
    for b in 1:expt.n_blocks
        curr_block = data[in(b).(data.block),:]
        b_tracker = Block_Tracker(expt.alien_time,0)
        while (b_tracker.block_time < expt.block_max_time) & (b_tracker.planet < expt.block_n_planet)
            curr_planet, p_tracker = get_planet(b, b_tracker,curr_block)
            while (b_tracker.block_time < expt.block_max_time) & p_tracker.on_planet

                # dig up reward and add to list
                p_tracker, total_reward = get_reward(p_tracker, total_reward, curr_planet)

                # add time that it took to dig it up
                b_tracker.block_time += expt.harvest_time + expt.iti
                total_time += expt.harvest_time + expt.iti

                # probability of cluster
                global prob_k = prob_cluster(p_tracker.curr_reward, p_tracker.decay_list, N, alpha, particles)
                samples,clusters = sample_v_stay(particles,weights, prob_k, n_samples,p_tracker.decay_list)
                global samples_all = samples

                clusters = round.(Int, clusters)
                K = maximum(clusters)
                append!(n_cluster_inferred,length(prob_k[1]))
                d =Multinomial(n_samples,tally(clusters,K)/n_samples)
                model_uncertainty = entropy(d)
                gamma_effective = 1/(1+exp(-(gamma_base - gamma_coef*model_uncertainty)))
                v_stay = mean(samples)*p_tracker.curr_reward
                v_leave = (total_reward/total_time)*(expt.harvest_time + expt.iti)*gamma_effective
                p_tracker =  make_choice_max(v_stay, v_leave, p_tracker)
                append!(middle,[tally(clusters,K)])
                append!(middle_decay,[deepcopy(p_tracker.decay_list)])

            end
            append!(uncertainty,var(samples_all))
            append!(pred_decay,mean(samples_all))
            append!(middle,[[]])
            append!(middle_decay,[[]])


            if p_tracker.prt > 1
                particles, weights = resample_and_update_particles(particles,weights,prob_k,p_tracker.decay_list)
            end

            if p_tracker.prt > 1
                append!(true_decay,mean(p_tracker.decay_list))
            else
                append!(true_decay,0)
            end
            b_tracker.block_time += expt.travel_time + expt.alien_time
            b_tracker.planet += 1
            total_time += expt.travel_time + expt.alien_time
            behav = update_behavior(behav, p_tracker)
            N += 1
        end
    end
    return behav
end

function MVT_learn(data,params)
    expt = Experiment(5,360,20,2,10,5.5,1.5)
    behav = Behavior([],[],[],[])

    # initialize the particle filter
    alpha,beta,c  = params

    rho = 7.0
    total_reward = 0
    p_stay = 0.5
    k=[1.0]
    for b in 1:expt.n_blocks
        curr_block = data[in(b).(data.block),:]
        b_tracker = Block_Tracker(expt.alien_time,0)
        # println("BLOCK")
        # println(b)
        N=0
        while (b_tracker.block_time < expt.block_max_time) & (b_tracker.planet < expt.block_n_planet)
            curr_planet, p_tracker = get_planet(b, b_tracker,curr_block)
            # println("planet")
            # println(N)

            while (b_tracker.block_time < expt.block_max_time) & (p_tracker.on_planet)
                p_tracker, total_reward = get_reward(p_tracker, total_reward, curr_planet)
                #
                # println("reward")
                # println(p_tracker.curr_reward)

                b_tracker.block_time += expt.harvest_time + expt.iti

                if p_tracker.prt > 0
                    tau = expt.harvest_time + expt.iti
                    if last_reward == 0
                        curr_decay = 0
                    else
                        curr_decay = p_tracker.curr_reward/last_reward
                    end
                    append!(k,curr_decay)
                elseif N==0
                    tau = expt.harvest_time + expt.iti
                else
                    tau = expt.travel_time + expt.alien_time + expt.harvest_time + expt.iti
                end

                # println("alpha")
                # println(alpha)
                #
                # println("tau")
                # println(tau)
                #
                # println("reward")
                # println(p_tracker.curr_reward)

                delta = (p_tracker.curr_reward/tau) - rho
                # println("delta")
                # println(delta)
                rho = rho + (1-((1-alpha)^tau))*delta


                p_stay = 1/(1+exp(-c-beta*((p_tracker.curr_reward*mean(k))-(rho*(expt.harvest_time + expt.iti))))) # for next time step

                # sample based on p_stay
                p_tracker =  make_choice_draw(p_stay,p_tracker)
                global last_reward = deepcopy(p_tracker.curr_reward)
            end
            behav = update_behavior(behav, p_tracker)
            b_tracker.block_time += expt.travel_time + expt.alien_time
            b_tracker.planet += 1
            N = N+1

        end
    end
    return behav
end


function TD(data,params)
    expt = Experiment(5,360,20,2,10,5.5,1.5)
    behav = Behavior([],[],[],[])

    # initialize the particle filter
    alpha,beta,gamma,c  = params

    rho_init = 7
    total_reward = 0
    state_space = [135,68,34,17,9,5,3,2,1,0]
    s_init = rho_init/(1-gamma)
    Q_stay = [s_init,s_init,s_init,s_init,s_init,s_init,s_init,s_init,s_init]
    Q_leave = s_init
    delta = 0
    p_stay = 0.5
    for b in 1:expt.n_blocks
        curr_block = data[in(b).(data.block),:]
        b_tracker = Block_Tracker(expt.alien_time,0)
        # println("BLOCK")
        # println(b)
        N=0
        while (b_tracker.block_time < expt.block_max_time) & (b_tracker.planet < expt.block_n_planet)
            curr_planet, p_tracker = get_planet(b, b_tracker,curr_block)
            # println("planet")
            # println(N)

            while (b_tracker.block_time < expt.block_max_time) & (p_tracker.on_planet)
                p_tracker, total_reward = get_reward(p_tracker, total_reward, curr_planet)
                copy_state = deepcopy(state_space)
                append!(copy_state,p_tracker.curr_reward)
                sort!(copy_state,rev=true)
                if p_tracker.curr_reward < 1
                    global curr_state = length(state_space) - 1
                else
                    global curr_state = findall(x->x==p_tracker.curr_reward,copy_state)[1]-1
                end


                b_tracker.block_time += expt.harvest_time + expt.iti

                if p_tracker.prt > 0
                    tau = expt.harvest_time + expt.iti
                    delta = p_tracker.curr_reward + (gamma^tau)*(p_stay*Q_stay[curr_state] + (1-p_stay)*Q_leave) - Q_stay[curr_state]
                    Q_stay[curr_state]= Q_stay[curr_state] + alpha*delta
                else
                    tau = expt.travel_time + expt.alien_time + expt.harvest_time + expt.iti
                    delta = p_tracker.curr_reward + (gamma^tau)*(p_stay*Q_stay[curr_state] + (1-p_stay)*Q_leave) - Q_leave
                    Q_leave = Q_leave + alpha*delta
                end

                p_stay = 1/(1+exp(-c-beta*(Q_stay[curr_state]-Q_leave))) # for next time step

                # sample based on p_stay
                p_tracker =  make_choice_draw(p_stay,p_tracker)

            end
            behav = update_behavior(behav, p_tracker)
            b_tracker.block_time += expt.travel_time + expt.alien_time
            b_tracker.planet += 1
            N = N+1

        end
    end
    return behav
end

########################### RUN MODEL AND SAVE ##################################

function get_sub_data(sub_num)
    all_data=DataFrame(CSV.File("data/all_data_dataset_2022.csv",delim=','))
    sub_data = all_data[in(sub_num).(all_data.sub_num),:]
end

function run_model(sub_num,params,num_particles=1)
    # data to fit
    sub_data = get_sub_data(sub_num)
    # run model
    b = crp(sub_data,params,num_particles)
    opt_prt = optimal_policy(b)
    diff = b.prt - opt_prt

    # put in dataframe and save
    df = DataFrame(Dict("true_planet"=> b.true_planet,"galaxy"=> b.galaxy,"prt"=>b.prt,
        "opt_prt"=>opt_prt, "diff" => diff))
    save(string("savd_jld/sub",string(sub_num),".jld"), "df", df)
    return df
end
