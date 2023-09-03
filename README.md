# Harhen-Bornstein-2023-Overharvesting-as-Rational-Learning
Please feel free to get in touch (nharhen@uci.edu) if you plan on using/adapting the task or model! I'm happy to walkthrough the code or answer any questions. 


## Experiment
This contains the code for running the task and for analyzing the data. 
### Important Files 
- `experiment/run_exp/static/js/task.js` This contains the "meat" of the task code and includes the functions for the different trial types. 
- `experiment/run_exp/static/exp_struc/10017437_best.js` This defines the experiment structure including the order of planet types observed by all participants. Important to note: we only use the struc variable not r_0 (initial planet richness) and decay (decay rate). The initial planet richness and decay rates are drawn from distributions as necessary. 
- `experiment/data_analysis/analyze_data.ipynb` Statistical tests are run and plots generated within this jupyter notebook.  
- `experiment/data_analysis/data_combiner.py` Data_cleaning functions. 


## Model 
This contains the code for fitting the models (Bayesian Structure Learning model, Marginal Value Theorem + learning, and Temporal-Difference Learning) to participant's choice data and performing 10 fold cross validation. 
### Important Files 
- `model/fit_by_planet.jl` Running this file will fit a subject's choice data to one of the three models (example command: julia fit_by_planet.jl 10 0, to fit the Bayesian structure learning model to subject number 10's data).
- `model/10_fold_cv.jl` Running this file will compute the 10-fold cross validation for a subject for a given model (example command: julia 10_fold_cv.jl 10 0, to compute the cross-validation score for subject number 10 with the Bayesian structure learning model).
- `model/plot_modeling_results.ipynb` This contains the code for generating the model plots. This uses the parameters in fit_params folder and the cv scores in the cv folder. 