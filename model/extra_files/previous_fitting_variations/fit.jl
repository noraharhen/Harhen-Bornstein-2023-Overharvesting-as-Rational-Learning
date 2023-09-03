using JLD


include("./model.jl")
include("./opt.jl")
include("./gp_min.jl")

function get_sub_ref_point(sub_num)
    all_data=DataFrame(CSV.File("ref_point_by_block.csv",delim=','))
    sub_data = all_data[in(sub_num).(all_data.sub_num),:]

    galaxies = [0,1,2]
    all_prt_rel_opt = []
    all_blocks = []
    all_galaxies = []
    for block in 1:5
        block_data = sub_data[in(block).(sub_data.block),:]
        for galaxy in galaxies
            galaxy_data = block_data[in(galaxy).(block_data.galaxy),:]
            if nrow(galaxy_data) > 0
                append!(all_prt_rel_opt,galaxy_data.prt_rel_om)
                append!(all_blocks,block)
                append!(all_galaxies,galaxy)
            end
        end
    end
    return DataFrame(Dict("block"=>all_blocks,"galaxy"=>all_galaxies,"prt_rel_opt"=>all_prt_rel_opt))
end

function get_preced_galaxy(galaxy)
    prev_galaxy_lst = [100]
    last_planet_galaxy = 100
    prev_galaxy = 100
    for i in 2:length(galaxy)
        current_planet_cluster = galaxy[i]
        last_planet_galaxy = galaxy[i-1]
        if current_planet_cluster != last_planet_galaxy
            prev_galaxy = last_planet_galaxy
        end
        append!(prev_galaxy_lst,prev_galaxy)
    end
    return prev_galaxy_lst
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
    df = DataFrame(Dict("true_planet"=> behavior.true_planet,"block"=> get_block(behavior.true_planet),"galaxy"=> behavior.galaxy,"preced_galaxy"=> get_preced_galaxy(behavior.galaxy),"prt"=>behavior.prt,
        "opt_prt"=>opt_prt, "diff" => diff))

    gdf = groupby(df, [:block,:galaxy])
    prt_avg = combine(gdf, :diff => mean)
    return prt_avg
end

function return_loss(behavior,ref_points)
    prt_avg = package_results(behavior)
    galaxies = [0,1,2]
    sse = 0
    n_datapoints = 0
    for block in 1:5
        for galaxy in galaxies
            pred = prt_avg[(prt_avg[!,"block"].==block),:]
            target = ref_points[(ref_points[!,"block"].==block),:]

            pred = pred[(pred[!,"galaxy"].==galaxy),:].diff_mean
            target = target[(target[!,"galaxy"].==galaxy),:].prt_rel_opt

            if (length(pred) > 0) & (length(target) > 0)
                error = (pred[1] - target[1])^2
                sse += error
                n_datapoints += 1
            end
        end
    end
    return sse/n_datapoints
end

function loss_function(params,n_sims=10,num_particles=50)
    sub_num = parse(Int64,ARGS[1])

    sub_data = get_sub_data(sub_num)
    sub_ref_points = get_sub_ref_point(sub_num)
    all_sse = 0
    for i in 1:n_sims
        b = multiple_ref_point(sub_data,params)
        all_sse += return_loss(b,sub_ref_points)
    end
    return all_sse/n_sims
end

function opt_params()
    println("start opt")
    gp_result = gp_minimize(loss_function,1)
    res = choose_optimum(gp_result)
    return res
end

function main()
    sub_num = parse(Int64,ARGS[1])
    result = opt_params()
    println(result)
    save(string("fit_params/sub",string(sub_num),".jld"), "res", result)
end

main()
