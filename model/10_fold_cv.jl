using JLD


include("./model.jl")
include("./opt.jl")
include("./sobol_min.jl")

function get_sub_ref_point(sub_num)
    all_data=DataFrame(CSV.File("data/ref_point_data_planet_by_planet_dataset_2022.csv",delim=','))
    sub_data = all_data[in(sub_num).(all_data.sub_num),:]

    return sub_data
end

function get_sub_ref_point_fold(sub_num,fold)
    all_data=DataFrame(CSV.File("data/ref_point_data_planet_by_planet_2022_10_fold.csv",delim=','))
    sub_data = all_data[in(sub_num).(all_data.sub_num),:]
    fold_data = sub_data[in(fold).(sub_data.fold_num),:]
    return fold_data
end

function get_block(true_planet)
    block =[]
    for p in true_planet
        if p < 20
            append!(block,1)
        elseif p < 40
            append!(block,2)
        elseif p < 60
            append!(block,3)
        elseif p < 80
            append!(block,4)
        elseif p < 100
            append!(block,5)
        end
    end
    return block
end

function package_results(behavior)
    opt_prt = optimal_policy(behavior)
    diff = behavior.prt - opt_prt

    # put in dataframe and save
    df = DataFrame(Dict("true_planet"=> behavior.true_planet,"block"=> get_block(behavior.true_planet),"galaxy"=> behavior.galaxy,"prt"=>behavior.prt,
        "opt_prt"=>opt_prt, "diff" => diff))

    gdf = groupby(df, :true_planet)
    prt_avg = combine(gdf, :prt => mean)
    return prt_avg
end

function return_loss(behavior,ref_points)
    prt_avg = package_results(behavior)
    planets = ref_points.true_planet

    sse = 0
    for p in planets
        pred = prt_avg[(prt_avg[!,"true_planet"].==p),:].prt_mean
        target = ref_points[(ref_points[!,"true_planet"].==p),:].prt

        if (length(pred) > 0) & (length(target) > 0)
            error = (pred[1] - target[1])^2
            sse += error
        end
    end
    return sse
end


function loss_function_crp(params,n_sims=25,num_particles=1)
    sub_num = parse(Int64,ARGS[1])
    sub_data = get_sub_data(sub_num)
    sub_ref_points = get_sub_ref_point_fold(sub_num,fold_num)
    filter!(row -> row.dataset == "train", sub_ref_points)

    all_sse = 0
    for i in 1:n_sims
        b = crp_adaptiveDiscount(sub_data,params,num_particles)
        all_sse += return_loss(b,sub_ref_points)
    end
    return all_sse/n_sims
end

function loss_function_mvt(params,n_sims=25)
    sub_num = parse(Int64,ARGS[1])
    sub_data = get_sub_data(sub_num)
    sub_ref_points = get_sub_ref_point_fold(sub_num,fold_num)
    filter!(row -> row.dataset == "train", sub_ref_points)

    all_sse = 0
    for i in 1:n_sims
        b = MVT_learn(sub_data,params)
        all_sse += return_loss(b,sub_ref_points)
    end
    return all_sse/n_sims
end

function loss_function_td(params,n_sims=25)
    sub_num = parse(Int64,ARGS[1])
    sub_data = get_sub_data(sub_num)
    sub_ref_points = get_sub_ref_point_fold(sub_num,fold_num)
    filter!(row -> row.dataset == "train", sub_ref_points)

    all_sse = 0
    for i in 1:n_sims
        b = TD(sub_data,params)
        all_sse += return_loss(b,sub_ref_points)
    end
    return all_sse/n_sims
end

function return_fold_loss(behavior,ref_points,fold)
    prt_avg = package_results(behavior)
    planets = ref_points.true_planet

    sse = 0
    for p in planets
        pred = prt_avg[(prt_avg[!,"true_planet"].==p),:].prt_mean
        target = ref_points[(ref_points[!,"true_planet"].==p),:].prt

        if (length(pred) > 0) & (length(target) > 0)
            error = (pred[1] - target[1])^2
            sse += error
        end
    end
    return sse
end

function opt_params(model_num, n_sims=30,num_particles=1)
    println("start opt")
    sub_num = parse(Int64,ARGS[1])
    sub_data = get_sub_data(sub_num)
    all_loss = []
    for fold in 1:10
        global fold_num = fold
        if model_num == 0
            params = sobol_min(loss_function_crp,model_num)
        elseif model_num == 1
            params = sobol_min(loss_function_mvt,model_num)
        elseif model_num == 2
            params = sobol_min(loss_function_td,model_num)
        end
        fold_loss = []
        sub_ref_points = get_sub_ref_point_fold(sub_num,fold_num)
        filter!(row -> row.dataset == "test", sub_ref_points)
        for i in 1:n_sims
            if model_num == 0
                b=crp_adaptiveDiscount(sub_data,params,num_particles)
            elseif model_num == 1
                b=MVT_learn(sub_data,params)
            elseif model_num == 2
                b=TD(sub_data,params)
            end
            append!(fold_loss,return_fold_loss(b,sub_ref_points,fold_num))
        end
        append!(all_loss,mean(filter(!isnan, fold_loss))) # average across simulatio number within fold
    end
    return mean(filter(!isnan, all_loss)) # average across folds
end

function main()
    sub_num = parse(Int64,ARGS[1])
    model_num = parse(Int64,ARGS[2])

    cv_score = opt_params(model_num)

    if model_num == 0
        save(string("cv/adaptive_discount_nPart1_10_10_3/sub",string(sub_num),".jld"), "res", cv_score)
    elseif model_num == 1
        save(string("cv/mvt_learn_1_20_3/sub",string(sub_num),".jld"), "res", cv_score)
    elseif model_num == 2
        save(string("cv/td_1_20_1_3/sub",string(sub_num),".jld"), "res", cv_score)
    end
end

main()
