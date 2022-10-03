#!/bin/bash
#SBATCH --job-name=sub_replace      ## Name of the job.
#SBATCH -A nharhen  ## account to charge
#SBATCH -p free          ## partition/queue name
#SBATCH --nodes=1            ## (-N) number of nodes to use
#SBATCH --ntasks=1           ## (-n) number of tasks to launch
#SBATCH --cpus-per-task=4    ## number of cores the job needs
#SBATCH --error=slurm-replace.err ## error log file

# Run command hostname and save output to the file out.txt
srun julia cross_val_planet.jl replace > job_outfiles/sub_replace.txt
