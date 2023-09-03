using Sobol
include("./model.jl")
include("./box.jl")

function minimize(func, samp_points)
    all_loss = []
    params_tried = []

    for i in 1:length(samp_points)
    println(samp_points[i])
        params = samp_points[i]
        loss = func(params)
        append!(all_loss,loss)
        append!(params_tried,[params])
    end
    min_ind = argmin(all_loss)
    return params_tried[min_ind]
end

function sobol_min(func,model_num)
    if model_num == 0
        box = Box(
        a = (0, 10,),
        b = (-2, 10,),
        c = (-3, 3),
        )
    elseif model_num == 1
            box = Box(
        a = (0, 1,),
        b = (0, 20,),
        c = (-3, 3),
        )
    elseif model_num == 2
        box = Box(
        a = (0, 1,),
        b = (0, 20,),
        c = (0, 1),
        d = (-3, 3),
        )

    end
    N = 1000
    xs = Iterators.take(SobolSeq(n_free(box)), N) |> collect
    xs=map(box, xs)
    result = minimize(func, xs)
    return result
end
