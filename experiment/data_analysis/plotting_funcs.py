import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import data_combiner as dc

##################### Stay leave tracker #######################################

def plot_avg_prt_traject(all_data,savefig=0,mvt_comp=0,curr_round='round_1'):
    plt.rcParams["lines.linewidth"] = 2
    cond_names = ['poor_extreme','poor_graded','neutral_extreme','neutral_graded','rich_extreme','rich_graded']
    ax = sns.catplot(x='true_planet',y='prt',col='condition',col_order = [1,2,4,3,6,5],ci=68,kind='point',data=all_data)

    for cond in range(1,7):
        condition = dc.condition_type(cond)
        exp_struc, rho_0,all_decay = dc.load_data(condition)
        event_shifts = np.cumsum([len(x) for x in dc.flatten_list(exp_struc)])
        event_shifts =np.insert(event_shifts,0,0)
        neigh_order = [x[0] for x in dc.flatten_list(exp_struc)]
        for i in range(len(event_shifts)-1):
            if neigh_order[i] == 0:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='r', alpha=0.1)
            elif neigh_order[i] == 1:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='b', alpha=0.1)
            elif neigh_order[i] == 2:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='g', alpha=0.1)

        if mvt_comp:
            ax.axes[0][cond-1].plot(all_data.loc[all_data['condition']==cond].groupby('true_planet').mean()['opt_prt'],'k')
            #ax.axes[0][cond-1].plot(all_data.loc[all_data['condition']==cond].groupby('true_planet').mean()['opt_prt_galaxy'],'k--')


        ax.axes[0][cond-1].plot([20,20],[0,25],'w--')
        ax.axes[0][cond-1].plot([40,40],[0,25],'w--')
        ax.axes[0][cond-1].plot([60,60],[0,25],'w--')
        ax.axes[0][cond-1].plot([80,80],[0,25],'w--')
        ax.axes[0][cond-1].plot([100,100],[0,25],'w--')
        ax.axes[0][cond-1].plot([120,120],[0,25],'w--')
        ax.axes[0][cond-1].set_ylim([1,25])
        ax.axes[0][cond-1].set_ylabel('planet residence time')
        ax.axes[0][cond-1].set_xlabel('planet #')
        ax.axes[0][cond-1].set_title(cond_names[cond-1])
        ax.axes[0][cond-1].set_xticks([])

    if savefig:
        if mvt_comp:
            ax.savefig(curr_round+"/average_prt_traject_mvt_comp.png")
        else:
            ax.savefig(curr_round+"/average_prt_traject.png")
    return

def plot_avg_prt_traject_post(all_data,savefig=0,mvt_comp=0,curr_round='round_1'):
    plt.rcParams["lines.linewidth"] = 2
    cond_names = ['poor_extreme','poor_graded','neutral_extreme','neutral_graded','rich_extreme','rich_graded']
    ax = sns.catplot(x='true_planet',y='prt',col='condition',col_order = [1,2,4,3,6,5],ci=68,kind='point',data=all_data)

    for cond in range(1,7):
        condition = dc.condition_type(cond)
        exp_struc, rho_0,all_decay = dc.load_data(condition)
        exp_struc = exp_struc[2:]
        event_shifts = np.cumsum([len(x) for x in dc.flatten_list(exp_struc)])
        event_shifts =np.insert(event_shifts,0,0)
        neigh_order = [x[0] for x in dc.flatten_list(exp_struc)]
        for i in range(len(event_shifts)-1):
            if neigh_order[i] == 0:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='r', alpha=0.1)
            elif neigh_order[i] == 1:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='b', alpha=0.1)
            elif neigh_order[i] == 2:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='g', alpha=0.1)

        if mvt_comp:
            ax.axes[0][cond-1].plot(all_data.loc[all_data['condition']==cond].groupby('true_planet').mean()['opt_prt'],'k')
            #ax.axes[0][cond-1].plot(all_data.loc[all_data['condition']==cond].groupby('true_planet').mean()['opt_prt_galaxy'],'k--')

        ax.axes[0][cond-1].plot([20,20],[0,25],'w--')
        ax.axes[0][cond-1].plot([40,40],[0,25],'w--')
        ax.axes[0][cond-1].plot([60,60],[0,25],'w--')
        ax.axes[0][cond-1].plot([80,80],[0,25],'w--')
        ax.axes[0][cond-1].set_ylim([1,25])
        ax.axes[0][cond-1].set_ylabel('planet residence time')
        ax.axes[0][cond-1].set_xlabel('planet #')
        ax.axes[0][cond-1].set_title(cond_names[cond-1])
        ax.axes[0][cond-1].set_xticks([])

    if savefig:
        if mvt_comp:
            ax.savefig(curr_round+"/average_prt_traject_mvt_comp_post.png")
        else:
            ax.savefig(curr_round+"/average_prt_traject_post.png")
    return

def plot_indiv_prt_traject(all_data,cond,cond_subs,savefig=0):
    plt.rcParams["figure.figsize"] = (40,40)
    plt.rcParams['font.size'] = 15
    condition = dc.condition_type(cond)
    exp_struc, rho_0,all_decay = dc.load_data(condition)
    cond_sub_num = list(set(cond_subs['sub_num']))
    num_subs = len(cond_sub_num)
    pal = sns.color_palette("hls",num_subs)
    for sub_ind in range(num_subs):
        sub = cond_sub_num[sub_ind]
        plt.subplot(15,5,sub_ind+1)
        sub_data = all_data.loc[all_data["sub_num"]==sub]
        initial_rewards = sub_data["initial_reward"].tolist()
        num_planets = dc.get_last_planet_in_block(sub_data)


        plt.plot(sub_data["planet"],sub_data['prt'],color=pal[sub_ind])
        plt.plot(sub_data["planet"],sub_data['opt_prt'],color='black',linewidth=1)

        curr_planet = 0
        for block in range(6):
            flat_struc = dc.flatten_list(exp_struc[block])
            flat_struc = flat_struc[:num_planets[block]]
            for planet in flat_struc:
                if planet == 0:
                    plt.axvspan(curr_planet, curr_planet+1, facecolor='r', alpha=0.1)
                elif planet == 1:
                    plt.axvspan(curr_planet, curr_planet+1, facecolor='b', alpha=0.1)
                elif planet == 2:
                    plt.axvspan(curr_planet, curr_planet+1, facecolor='g', alpha=0.1)
                curr_planet += 1
            plt.plot([curr_planet,curr_planet],[0,30],'k--',linewidth=0.5)
        plt.ylim([1,35])
        #plt.xlim([0,60])
        plt.ylabel('prt')
        plt.xlabel('planet')
        plt.title("Subject Num: " + str(sub))

    plt.tight_layout()
    if savefig:
        plt.savefig(round+"/prt_trajectory_cond_"+str(cond)+".png")


def plot_prt_rel_mvt_traject(all_data,savefig=0,curr_round='round_1'):
    plt.rcParams["lines.linewidth"] = 2
    cond_names = ['poor_extreme','poor_graded','neutral_extreme','neutral_graded','rich_extreme','rich_graded']

    ax = sns.catplot(x='true_planet',y='prt_rel_mvt',col='condition',col_order = [1,2,4,3,6,5],ci=68,kind='point',data=all_data)

    for cond in range(1,7):
        condition = dc.condition_type(cond)
        exp_struc, rho_0,all_decay = dc.load_data(condition)
        event_shifts = np.cumsum([len(x) for x in dc.flatten_list(exp_struc)])
        event_shifts =np.insert(event_shifts,0,0)
        neigh_order = [x[0] for x in dc.flatten_list(exp_struc)]
        for i in range(len(event_shifts)-1):
            if neigh_order[i] == 0:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='r', alpha=0.1)
            elif neigh_order[i] == 1:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='b', alpha=0.1)
            elif neigh_order[i] == 2:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='g', alpha=0.1)


        ax.axes[0][cond-1].plot([20,20],[0,10],'w--')
        ax.axes[0][cond-1].plot([40,40],[0,10],'w--')
        ax.axes[0][cond-1].plot([60,60],[0,10],'w--')
        ax.axes[0][cond-1].plot([80,80],[0,10],'w--')
        ax.axes[0][cond-1].plot([100,100],[0,10],'w--')
        ax.axes[0][cond-1].plot([120,120],[0,10],'w--')
        ax.axes[0][cond-1].set_ylim([1,10])
        ax.axes[0][cond-1].set_ylabel('planet residence time')
        ax.axes[0][cond-1].set_xlabel('planet #')
        ax.axes[0][cond-1].set_title(cond_names[cond-1])
        ax.axes[0][cond-1].set_xticks([])

    if savefig:
        if mvt_comp:
            ax.savefig(curr_round+"/prt_rel_mvt_traject_mvt_comp.png")
        else:
            ax.savefig(curr_round+"/prt_rel_mvt_traject.png")
    return

def plot_prt_rel_mvt_traject_post(all_data,savefig=0,curr_round='round_1'):
    plt.rcParams["lines.linewidth"] = 2
    cond_names = ['poor_extreme','poor_graded','neutral_extreme','neutral_graded','rich_extreme','rich_graded']
    ax = sns.catplot(x='true_planet',y='prt_rel_mvt',col='condition',col_order=[1,2,4,3,6,5],ci=68,kind='point',data=all_data)

    for cond in range(1,7):
        condition = dc.condition_type(cond)
        exp_struc, rho_0,all_decay = dc.load_data(condition)
        exp_struc = exp_struc[2:]
        event_shifts = np.cumsum([len(x) for x in dc.flatten_list(exp_struc)])
        event_shifts =np.insert(event_shifts,0,0)
        neigh_order = [x[0] for x in dc.flatten_list(exp_struc)]
        for i in range(len(event_shifts)-1):
            if neigh_order[i] == 0:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='r', alpha=0.1)
            elif neigh_order[i] == 1:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='b', alpha=0.1)
            elif neigh_order[i] == 2:
                ax.axes[0][cond-1].axvspan(event_shifts[i],event_shifts[i+1],facecolor='g', alpha=0.1)


        ax.axes[0][cond-1].plot([20,20],[0,10],'w--')
        ax.axes[0][cond-1].plot([40,40],[0,10],'w--')
        ax.axes[0][cond-1].plot([60,60],[0,10],'w--')
        ax.axes[0][cond-1].plot([80,80],[0,10],'w--')
        ax.axes[0][cond-1].set_ylim([1,10])
        ax.axes[0][cond-1].set_ylabel('planet residence time')
        ax.axes[0][cond-1].set_xlabel('planet #')
        ax.axes[0][cond-1].set_title(cond_names[cond-1])
        ax.axes[0][cond-1].set_xticks([])

    if savefig:
        if mvt_comp:
            ax.savefig(curr_round+"/prt_rel_mvt_traject_mvt_comp_post.png")
        else:
            ax.savefig(curr_round+"/prt_rel_mvt_traject_post.png")
    return

##################### Average PRT separated by galaxy type #######################################

def plot_prt_gal_sep(all_data,cond,cond_subs,savefig=0):
    plt.rcParams["figure.figsize"] = (30,40)

    for sub in cond_subs:
        try:
            ax = plt.subplot(9,5,cond_subs.index(sub)+1)

            sub_data = all_data.loc[all_data["sub_num"]==sub]
            ax.set_title('sub num: ' +str(sub))

            g=sns.pointplot(x='galaxy',y='prt',hue='preced_gal',hue_order=[0,1,2],join=False,ci=68,data=sub_data,palette=['r','b','g'])
            g.set_xticklabels(['poor','neutral','rich'])
            plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0.)
            g.get_legend().remove()
            g.set_title('sub_num: '+str(sub))
        except:
            continue

    plt.tight_layout()
    if savefig:
        plt.savefig(round+"/prt_sep_gal_cond"+str(cond)+".png")
