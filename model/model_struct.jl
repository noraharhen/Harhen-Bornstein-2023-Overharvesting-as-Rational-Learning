struct Experiment
    n_blocks
    block_max_time
    block_n_planet
    harvest_time
    travel_time
    alien_time
    iti
end

mutable struct Behavior
    true_planet
    prt
    galaxy
    reward_list
end

mutable struct Block_Tracker
    block_time
    planet
end

mutable struct Planet_Tracker
    on_planet
    galaxy
    curr_reward
    prt
    true_planet
    reward_list
    decay_list
end
