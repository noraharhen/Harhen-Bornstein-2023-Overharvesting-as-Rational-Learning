using Sobol
include("./model.jl")
include("./box.jl")



function minimize(func, samp_points)
    all_loss = []
    params_tried = []

    for i in 1:length(samp_points)
        params = samp_points[i]
        loss = func(params)
        append!(all_loss,loss)
        append!(params_tried,[params])
    end
    min_ind = argmin(all_loss)
    return params_tried[min_ind]
end

function sobol_min(func)
    box = Box(
        a = (0,1),
        b = (-1, 20),
        c = (-3, 3),

        #b = (-2, 10,),
        #c = (-5, 5,),
    )
    N = 1000
    xs = Iterators.take(SobolSeq(n_free(box)), N) |> collect
    xs=map(box, xs)
    result = minimize(func, xs)
    return result
end
