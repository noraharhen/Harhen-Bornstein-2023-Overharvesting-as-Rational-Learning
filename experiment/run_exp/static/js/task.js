/*
 * Requires:
 *     psiturk.js
 *     utils.js
 */

/********************
* HTML manipulation
*
* All HTML files in the templates directory are requested
* from the server when the PsiTurk object is created above. We
* need code to get those pages from the PsiTurk object and
* insert them into the document.
*
********************/
var debug_mode = 0; // debug mode determines how long the blocks are, 5 sec in debug mode, 5 minutes in actual experiment
//var data_save_method = 'csv_server_py';
var data_save_method = 'csv_server_py';

/* Disable right-click/context menu */
if(debug_mode == false) {
  document.addEventListener('contextmenu', function (event) { event.preventDefault(); });
}

/* Escape key or exit fullscreen ends experiment */

// Callback function for handling potential end-experiment-triggering events
function exit_handler(event) {
  var exit_message = "The experiment was ended by pressing the escape key or exiting fullscreen.";
  // If 'esc' key pressed or exiting fullscreen (but not if experiment-triggered exit)
  if(event.code == 'Escape' || (event.type == 'fullscreenchange' && !document.webkitIsFullScreen &&
      !document.mozFullScreen && !document.msFullscreenElement) && normal_exit == false) {
    jsPsych.endExperiment(exit_message);
  }
}


// for playiing audio
function sound(src) {
  this.sound = document.createElement("audio");
  this.sound.src = src;
  this.sound.setAttribute("preload", "auto");
  this.sound.setAttribute("controls", "none");
  this.sound.style.display = "none";
  document.body.appendChild(this.sound);
  this.play = function(){
    this.sound.play();
  }
  this.stop = function(){
    this.sound.pause();
  }
}

// Yates-Fischer algorithm
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

// for getting a list of random numbers 0 to 42
function rand_list(upper_bound) {
  var arr = Array.from(Array(upper_bound).keys())
  arr = arr.map(function(val){return ++val;});
  shuffle(arr);
  return arr
}


// check if arrays match, for quiz checking purposes
var arraysMatch = function (arr1, arr2) {
	// Check if the arrays are the same length
  if (JSON.stringify(arr1) === JSON.stringify(arr2)) {
    return true;
  } else{
    return false
  }
};


var get_answers = function (answers_dict) {
  var answers = []
  var keys = ["Q0","Q1","Q2"]

  keys.forEach(function (item, index) {
    answers.push(answers_dict[item])
  });
  return answers
}


// Will be set to true when experiment is exiting fullscreen normally, to prevent above end experiment code
var normal_exit = false;
var window_height = window.screen.height;


// Randomly generate an 8-character alphanumeric subject ID via jsPsych
var subject_id = jsPsych.randomization.randomID(8);

// Load PsiTurk
var psiturk = new PsiTurk(uniqueId, adServerLoc,mode);
var cond = psiturk.taskdata.get('condition'); // they do zero-indexing


// weird fix because we got rid of the neutral sequences
if (cond == 0) {
  condition = 1;
} else if (cond == 1) {
  condition = 2;
} else if (cond == 2) {
  condition = 5;
} else if (cond == 3) {
  condition = 6;
}

var timeline = []; // structures the experiment
var image_prefix = "../static/images/task_images/";
var image_prefix_button = "<img src=../static/images/task_images/";

// default images
const decision_img = [image_prefix+"land.jpg"];
const land_img = [image_prefix+"land.jpg"]
const dig_img = [image_prefix+"dig.jpg"];
const space_treasure_img = [image_prefix+"gems/100.jpg"];
const harvest_practice_img = [image_prefix+"barrel_text.jpg"];
const travel_sequence = [image_prefix+"rocket-01.jpg",image_prefix+"rocket-02.jpg",image_prefix+"rocket-03.jpg",
image_prefix+"rocket-04.jpg",image_prefix+"rocket-05.jpg",image_prefix+"rocket-06.jpg",image_prefix+"rocket-07.jpg",
 image_prefix+"rocket-08.jpg",image_prefix+"rocket-09.jpg"];

const dig_sequence = [image_prefix+"dig.jpg",image_prefix+"land.jpg",image_prefix+"dig.jpg"];

const time_out_img = [image_prefix+"time_out.jpg"];
const catch_img = [image_prefix+"catch.jpg"];

// when to end block timing
var b_num = 1;

if (debug_mode) {
  var total_num_blocks =0;
	var block_len = 20000;
  var n_prac_trials = 0;
} else {
  var total_num_blocks = 5;
  var block_len = [360000,360000,360000,360000,360000]; // array of how long block_len should be
  //var block_len = [300,300,300,300,300,300];
  var n_prac_trials = 4;
  timeline.push({
    type: 'fullscreen',
    fullscreen_mode: true
  });
}

// number of planets visited and time spent on planet
//const condition = 1;
var planet = 0;
var prt = 0;
var total_space_treasure = 0;
var cents_per_gem = 0.0002; /* 5000 gems you get a dollar */
var planet_left,planet_right,alien_left,alien_right;
var num_planets = []; // keep track of number of planets we visit in each block
var block_num_planet = 0;

// practice trials
var curr_prac_trial = 1;
var n_prac_rounds = 1;

// aliens
var aliens_prac = [121,122,123,124];
var aliens = rand_list(120); // will pop every time use a new alien
var aliens_copy = [];
var alien;


var num_quiz_failures = 0;
// for quiz
var correct_answers = ['C','B','B'];

/* STRUCTURE OF GAME - TYPES OF TRIALS */
// arival at new planet
var landing = {
	type: 'image-keyboard-response',
	stimulus: land_img,
  prompt: "<p style = 'color:white;'>Dig here or travel to a new planet?</p>",
	stimulus_height: 700,
	choices: jsPsych.NO_KEYS,
	stimulus_duration: 500,
	trial_duration: 500,
	on_finish: function(data) {
		data.next_reward = Math.round(Math.max(Math.min(normalRandomScaled(100,5),135),0));
		data.planet = planet;
		data.trial_type = "land";
	}
}

var landing_prac = {
	type: 'image-keyboard-response',
	stimulus: land_img,
  prompt: "<p style = 'color:white;'><strong>Practice Trial</strong></p> <p style = 'color:white;'>Dig here ('Q') or travel to a new planet ('P')?</p>",
	stimulus_height: 700,
	choices: jsPsych.NO_KEYS,
	stimulus_duration: 500,
	trial_duration: 500,
	on_finish: function(data) {
		data.next_reward = Math.round(Math.max(Math.min(normalRandomScaled(100,5),135),0));
		data.planet = planet;
		data.trial_type = "land_prac";
	}
}

// digging digging
var dig = {
	type: 'animation',
	stimuli: dig_sequence,
  prompt: "<p style = 'color:white;'> Dig here or travel to a new planet?</p>",
  frame_time: 667,
  choices: jsPsych.NO_KEYS,
  on_start: function(dig) {
    var last_trial_data = jsPsych.data.get().last(1).values()[0];
    if (last_trial_data.trial_type == "decision") {
      var adjusted_rt = 2000 - last_trial_data.rt;
      dig.frame_time = adjusted_rt/3;
      var src = "../static/audio/axe.mp3#t=1.5,"
      var tt_sec = adjusted_rt/1000 + 1.5; //need to convert to seconds
      var axe_audio = new sound(src.concat(tt_sec.toString()))
      axe_audio.play()
    } else {
      var src = "../static/audio/axe.mp3#t=1.5,"
      var tt_sec = 4.5; //need to convert to seconds
      var axe_audio = new sound(src.concat(tt_sec.toString()))
      axe_audio.play()
    }
  },
	on_finish: function(data) {
		var last_trial_data = jsPsych.data.get().last(1).values()[0];
		data.next_reward = last_trial_data.next_reward;
		data.planet = planet;
		data.trial_type = "dig";
	}
};

var dig_instruc = {
  type: 'animation',
  stimuli: dig_sequence,
  prompt: "<p style = 'color:white;'> Dig here or travel to a new planet?</p>",
  choices: jsPsych.NO_KEYS,
  frame_time: 667,
  on_start: function(dig_instruc) {
    var src = "../static/audio/axe.mp3#t=1.5,"
    var tt_sec = 4.5; //need to convert to seconds
    var axe_audio = new sound(src.concat(tt_sec.toString()))
    axe_audio.play()
  },
	on_finish: function(data) {
		data.trial_type = "dig_instruc";
	}
}

var dig_prac = {
  type: 'animation',
  stimuli: dig_sequence,
  prompt: "<p style = 'color:white;'><strong>Practice Trial</strong></p> <p style = 'color:white;'>Dig here ('Q') or travel to a new planet ('P')?</p>",
  choices: jsPsych.NO_KEYS,
  frame_time: 667,
  on_start: function(dig_prac) {
    var last_trial_data = jsPsych.data.get().last(1).values()[0];
    if (last_trial_data.trial_type == "decision") {
      var adjusted_rt = 2000 - last_trial_data.rt;
      dig_prac.frame_time = adjusted_rt/3;
      var src = "../static/audio/axe.mp3#t=1.5,"
      var tt_sec = adjusted_rt/1000 + 1.5; //need to convert to seconds
      var axe_audio = new sound(src.concat(tt_sec.toString()))
      axe_audio.play()
    } else {
      var src = "../static/audio/axe.mp3#t=1.5,"
      var tt_sec = 4.5; //need to convert to seconds
      var axe_audio = new sound(src.concat(tt_sec.toString()))
      axe_audio.play()
    }
  },
	on_finish: function(data) {
		data.trial_type = "dig_prac";
	}
}

// digging up the treasure, displaying how many gems they got
var harvest = {
	type: 'image-keyboard-response',
	stimulus: space_treasure_img,
  prompt: "<p style ='color:white;'>Dig here or travel to a new planet?</p>",
	stimulus_height:700,
	stimulus_duration: 1500, // in milliseconds
	trial_duration: 1500,
	choices: jsPsych.NO_KEYS,
	on_start: function(harvest) {
		var last_trial_data = jsPsych.data.get().last(2).values()[0]; // last trial was dig, before that was decision
		var reward = last_trial_data.next_reward; // round to one decimal point
		var folder_prefix = '../static/images/task_images/gems/';
		var integer = Math.round(reward.toString());
		var img_suffix = '.jpg'
		var harvest_img = folder_prefix.concat(integer,img_suffix)
		harvest.stimulus = harvest_img;
	},
	on_finish: function(data) {
		var last_trial_data = jsPsych.data.get().last(3).values()[0];
    var galaxy_type = struc[b_num-1][block_num_planet-1]
		var decay_rate = get_decay_rate(galaxy_type);
    data.reward_received = last_trial_data.next_reward; // what did we receive from this harvest
		data.next_reward = Math.round(last_trial_data.next_reward*decay_rate);
		data.decay_rate_actual = decay_rate;
		data.decay_rate_exp = data.next_reward/last_trial_data.next_reward; // calculate the decay rate as seen by the  participant not what was actual sampled
    data.planet = planet;
		data.trial_type = "harvest";
    window.total_space_treasure = total_space_treasure + last_trial_data.next_reward;

	},
};

// display barrels of gems instead of actual gems
var harvest_prac = {
	type: 'image-keyboard-response',
  prompt: "<p style = 'color:white;'><strong>Practice Trial</strong></p> <p style = 'color:white;'>Dig here ('Q') or travel to a new planet ('P')?</p>",
	stimulus: harvest_practice_img,
	stimulus_height:700,
	stimulus_duration: 1500, // in milliseconds
	trial_duration: 1500,
	choices: jsPsych.NO_KEYS,
  on_finish: function(data) {
		data.trial_type = "harvest_prac";
	}
}

var harvest_instruc = {
	type: 'image-keyboard-response',
	stimulus: '../static/images/task_images/gems/100.jpg',
  prompt: "<p style ='color:white;'>Dig here or travel to a new planet?</p>",
	stimulus_height:700,
	stimulus_duration: 1500, // in milliseconds
	trial_duration: 1500,
	choices: jsPsych.NO_KEYS,
	on_finish: function(data) {
		data.trial_type = "harvest_instruc";
  }
};


 var travel = {
	 type: 'animation',
	 stimuli: travel_sequence,
   prompt: "<p style ='color:white;'>Dig here or travel to a new planet?</p>",
	 frame_time: 1111, // in milliseconds
	 choices: jsPsych.NO_KEYS,
   on_start: function(travel) {
     var last_trial_data = jsPsych.data.get().last(1).values()[0];
     var last_rt = last_trial_data.rt;
     var adjusted_travel_time = 10000 - last_rt;
     travel.frame_time = adjusted_travel_time/9;
     var src = "../static/audio/rocket.mp3#t=0,"
     var tt_sec = adjusted_travel_time/1000-0.5; //need to convert to seconds
     var rocket_audio = new sound(src.concat(tt_sec.toString()))
     rocket_audio.play()
   },
   on_finish: function(data) {
     data.trial_type = "travel";
     data.planet = planet;
   }
 };

 var travel_prac = {
   type: 'animation',
   stimuli: travel_sequence,
   prompt: "<p style = 'color:white;'><strong>Practice Trial</strong></p> <p style = 'color:white;'>Dig here ('Q') or travel to a new planet ('P')?</p>",
   frame_time: 1111, // in milliseconds
   choices: jsPsych.NO_KEYS,
   on_start: function() {
     var last_trial_data = jsPsych.data.get().last(1).values()[0];
     var last_rt = last_trial_data.rt;
     var adjusted_travel_time = 10000 - last_rt;
     travel.frame_time = adjusted_travel_time/9;
     var src = "../static/audio/rocket.mp3#t=0,"
     var tt_sec = adjusted_travel_time/1000-0.5; //need to convert to seconds
     var rocket_audio = new sound(src.concat(tt_sec.toString()))
     rocket_audio.play()
   },
   on_finish: function(data) {
     data.trial_type = "travel_prac";
     data.planet = planet;
   },
 }

 var decision = {
	 type: 'image-keyboard-response',
	 stimulus: decision_img,
	 stimulus_height:700,
   trial_duration:2000,
	 prompt:"<p>Dig here or travel to a new planet?<p>",
   choices: ['A', 'L'],
	 on_finish: function(data) {
		var last_trial_data = jsPsych.data.get().last(2).values()[0];
    var last_two_trial_data = jsPsych.data.get().last(8).values()[0];

    console.log(last_trial_data)
    console.log(last_two_trial_data)

		data.next_reward = last_trial_data.next_reward;
		data.time_in_block = Date.now() - block_start;
		data.block_num = b_num;
		data.planet = planet;
		data.prt = prt;
    data.trial_type = "decision";


		 // end of block/ experiment
  if ((data.time_in_block >= block_len[b_num-1]) | (block_num_planet == 20))  {
       num_planets.push(planet)

         // if this is the last block
       if (b_num == total_num_blocks) { // end of block or end of exp
             jsPsych.addNodeToEndOfTimeline({timeline: [catch_trial,end_of_experiment,debrief,demographics,quic_intro,quic_prior_12,quic_prior_18],}, jsPsych.resumeExperiment);
         // this is the first block
         } else if (b_num == 1) {
             jsPsych.addNodeToEndOfTimeline({timeline: [catch_trial, end_of_block],}, jsPsych.resumeExperiment);
         // other blocks
         } else { // if this is the firs =t or second and choose to leave
          jsPsych.addNodeToEndOfTimeline({timeline: [end_of_block],}, jsPsych.resumeExperiment);
         }

         window.prt = 0;
         window.block_num_planet = 0;
         data.last_trial_on_planet = true;
         window.b_num = b_num + 1;
     // not the end
    } else {
      // travel
      if (data.key_press == jsPsych.pluginAPI.convertKeyCharacterToKeyCode('L'))  {

        jsPsych.addNodeToEndOfTimeline({timeline: [travel,alien_welcome,landing,dig,harvest,decision]}, jsPsych.resumeExperiment);
        data.last_trial_on_planet = true;
        window.prt = 0;
    // stay
    } else if (data.key_press == jsPsych.pluginAPI.convertKeyCharacterToKeyCode('A'))  {
      jsPsych.addNodeToEndOfTimeline({
         timeline: [dig,harvest,decision],
       }, jsPsych.resumeExperiment);

     window.prt = prt + 1;
     data.last_trial_on_planet = false;

      if ((last_two_trial_data.next_reward == last_trial_data.next_reward) & last_trial_data.next_reward < 5) {
            data.next_reward = 0}
    // didn't make choice
    } else {
      jsPsych.addNodeToEndOfTimeline({
        timeline: [time_out,decision],
      }, jsPsych.resumeExperiment);
      data.last_trial_on_planet = false;}
    }
  }}


var decision_prac = {
  type: 'image-keyboard-response',
  stimulus: decision_img,
  stimulus_height:700,
  trial_duration:2000,
  choices: ['A', 'L'],
  prompt: "<p><strong>Practice Trial</strong></p> <p>Dig here ('A') or travel to a new planet ('L')?</p>",
  on_finish: function(data) {
    data.trial_type = "decision_prac";
    if (curr_prac_trial > n_prac_trials) {
      jsPsych.addNodeToEndOfTimeline({
        timeline: [instructions_begin_exp],
      }, jsPsych.resumeExperiment);
      data.n_prac_rounds = n_prac_rounds
    } else {
      if (data.key_press == jsPsych.pluginAPI.convertKeyCharacterToKeyCode('A')) {
        // they chose to arvest
        jsPsych.addNodeToEndOfTimeline({
          timeline: [dig_prac,harvest_prac,decision_prac],
        }, jsPsych.resumeExperiment);
      } else if (data.key_press == jsPsych.pluginAPI.convertKeyCharacterToKeyCode('L')) {
        jsPsych.addNodeToEndOfTimeline({
          timeline: [ travel,alien_welcome_prac,landing_prac,dig_prac,harvest_prac,decision_prac],
        }, jsPsych.resumeExperiment);
      } else {
        jsPsych.addNodeToEndOfTimeline({
          timeline: [time_out,decision_prac],
        }, jsPsych.resumeExperiment);
      }
      last_trial_data = jsPsych.data.get().last(1).values()[0];
      data.next_reward = last_trial_data.next_reward;
      data.curr_prac_trial = curr_prac_trial;
      window.curr_prac_trial = curr_prac_trial + 1;
    }
  }
};

 var time_out = {
   type: 'image-keyboard-response',
   stimulus: time_out_img,
   prompt: "<p style = 'color:white;'>Dig here or travel to a new planet?</p>",
   stimulus_height:700,
   stimulus_duration: 2000, // in milliseconds
   trial_duration: 2000,
   choices: jsPsych.NO_KEYS,
   on_finish: function(data) {
     data.trial_type = "time_out";
     var last_trial_data = jsPsych.data.get().last(2).values()[0];
     var last_trial_data =
     data.next_reward = last_trial_data.next_reward;
     console.log(last_trial_data)
   }
 }

 var catch_trial = {
   type: 'image-keyboard-response',
   stimulus: catch_img,
   prompt: "<p style = 'color:white;'>Press the letter Z on your keyboard, please.</p>",
   stimulus_height:700,
   stimulus_duration: 10000, // in milliseconds
   trial_duration: 10000,
   choices: ['Z'],
   on_finish: function(data) {
     data.trial_type = "catch";
     var last_trial_data = jsPsych.data.get().last(2).values()[0];
     data.next_reward = last_trial_data.next_reward;
   }

 }

 // to check their understanding of the instructions
  var quiz_prac = {
    type:'survey-html-form',
    html:"<p><strong>Below are some questions to check that you understand the game. You can't move forward until you get all of them correct. </strong></p><br><br><p>What affects the amount of bonus money you will earn?</p><input type='radio' name='Q0' value='A' checked> The number of planets you visit<br><input type='radio' name='Q0' value='B'>  How long you stay at home base<br><input type='radio' name='Q0' value='C'> The number of gems you collect<br><br><br><br><p>The length of this experiment </p><input type='radio' name='Q1' value='A' checked> depends on how many planets you've visited.<br><input type='radio' name='Q1' value='B'>is fixed. <br><input type='radio' name='Q1' value='C'> depends on how many gems you've collected.<br><br><br><br><p>You get to stay at home base as long as you like.</p><input type='radio' name='Q2' value='A' checked> True<br><input type='radio' name='Q2' value='B'> False<br> <br><br><br>",
    on_finish: function(data) {
      var answers_dict = JSON.parse(data.responses);
      data.trial_type = "quiz_prac";
      if (arraysMatch(correct_answers,get_answers(answers_dict))) {
        // yay everything correct, can move forward
        jsPsych.addNodeToEndOfTimeline({
          timeline: [quiz_correct, instructions_practice_game, alien_welcome_prac, landing_prac, dig_prac, harvest_prac, decision_prac],
        }, jsPsych.resumeExperiment);
      } else {
        // got at least one thing wrong, need to go through instructions again
        jsPsych.addNodeToEndOfTimeline({
          timeline: [quiz_incorrect,instructions_goal,instructions_dig,dig_instruc,harvest_instruc,instructions_travel,travel_prac,instructions_time_out,instructions_break,quiz_prac],
        }, jsPsych.resumeExperiment);

        window.num_quiz_failures= num_quiz_failures + 1;

      }
    }
  }

  var quiz_correct = {
    type:'survey-html-form',
    html:"<p><strong>Good job! You got all the questions correct!</strong></p><br><br><p>What affects the amount of bonus money you will earn?</p><input type='radio' name='Q0' value='A' style='color:#eb3e17;'> The number of planets you visit<br><input type='radio' name='Q0' value='B' style='color:#eb3e17;'>  How long you stay at home base<br><input type='radio' name='Q0' value='C' style='color:#0eb314;' checked> The number of gems you collect<br><br><br><br><p>The length of this experiment </p><input type='radio' name='Q1' value='A' style='color:#eb3e17;'> depends on how many planets you've visited.<br><input type='radio' name='Q1' value='B' style='color:#0eb314;' checked>is fixed. <br><input type='radio' name='Q1' value='C' style='color:#eb3e17;'> depends on how many gems you've collected.<br><br><br><br><p>You get to stay at home base as long as you like.</p><input type='radio' name='Q2' value='A' style='color:#eb3e17;'> True<br><input type='radio' name='Q2' value='B' style='color:#0eb314;' checked> False<br> <br><br><br>",
    button_label: 'continue to practice game',
    on_finish: function(data) {
      data.trial_type = 'quiz_correct';
    }
  }

var quiz_incorrect = {
  type:'survey-html-form',
  html:"<p><strong>You missed some questions! You'll have to read over the instructions again. The correct answers are below. </strong></p><br><br><p>What affects the amount of bonus money you will earn?</p><input type='radio' name='Q0' value='A' style='color:#eb3e17;'> The number of planets you visit<br><input type='radio' name='Q0' value='B' style='color:#eb3e17;'>  How long you stay at home base<br><input type='radio' name='Q0' value='C' style='color:#0eb314;' checked> The number of gems you collect<br><br><br><br><p>The length of this experiment </p><input type='radio' name='Q1' value='A' style='color:#eb3e17;'> depends on how many planets you've visited.<br><input type='radio' name='Q1' value='B' style='color:#0eb314;' checked>is fixed. <br><input type='radio' name='Q1' value='C' style='color:#eb3e17;'> depends on how many gems you've collected.<br><br><br><br><p>You get to stay at home base as long as you like.</p><input type='radio' name='Q2' value='A' style='color:red'> True<br><input type='radio' name='Q2' value='B' style='color:#0eb314;' checked> False<br> <br><br><br>",
  button_label: 'read instructions again',
  on_finish: function(data) {
    data.trial_type = 'quiz_incorrect';
  }
}

var alien_welcome = {
  type: 'image-keyboard-response',
  prompt: "<p style ='color:white;'>Dig here or travel to a new planet?</p>",
  stimulus: time_out_img,
  stimulus_height:700,
  stimulus_duration: 5000, // in milliseconds
  trial_duration: 5000,
  choices: jsPsych.NO_KEYS,
  on_start: function(alien_welcome) {
    window.alien = aliens.shift().toString();
    window.aliens_copy.push(alien)
    alien_welcome.stimulus = "../static/images/task_images/aliens/alien_planet-".concat(alien,'.jpg')
  },
  on_finish: function(data) {
  	window.planet = planet + 1;
  	window.block_num_planet = block_num_planet + 1;
    data.alien = alien;
    data.aliens = aliens; // save the list of aliens here
    data.trial_type = "alien_welcome";
  }
}

var alien_welcome_prac = {
  type: 'image-keyboard-response',
  stimulus: time_out_img,
  prompt: "<p style = 'color:white;'><strong>Practice Trial</strong></p> <p style = 'color:white;'>Dig here ('Q') or travel to a new planet ('P')?</p>",
  stimulus_height:700,
  stimulus_duration: 5000, // in milliseconds
  trial_duration: 5000,
  choices: jsPsych.NO_KEYS,
  on_start: function(alien_welcome_prac) {
    window.alien = aliens_prac.pop().toString();
    alien_welcome_prac.stimulus = "../static/images/task_images/aliens/alien_planet-".concat(alien,'.jpg')
  },
  on_finish: function(data) {
    data.trial_type = "alien_welcome_prac";
  }
}


 /* INSTRUCTIONS   */

 // Welcome
 var welcome = {
   type: 'html-keyboard-response',
   stimulus: "<p>Howdy! In this experiment, you’ll be an explorer traveling through space to collect space treasure.</p><p>Your mission is to collect as much treasure as possible.</p><p>Press the <strong>space bar</strong> to begin reading the instructions!</p><br><br><p><img src='../static/images/task_images/opening_img-01.jpg' height='600' width='auto'></p>",
   choices: ['space'],
   on_finish: function(data){
     data.trial_type = "instruc_welcome";
     data.condition = condition;
   }
 };

 var instructions_goal = {
   type: 'html-keyboard-response',
	 stimulus: "<p> As a space explorer, you’ll visit different planets to dig for space treasure, these pink gems.</p> <p> The more space treasure you mine, the more bonus payment you’ll win! </p>  <p>[Press the <strong>space bar</strong> to continue] </p><br><br><p><img src='../static/images/task_images/pink_gem.jpg' height='300' width='auto'></p>",
   choices: ['space'],
   on_finish: function(data) {
     data.trial_type = "instruc_goal";
   }
 };

 // instructions
 var instructions_dig = {
   type: 'html-keyboard-response',
   stimulus: "<p> When you’ve arrived at a new planet, you will dig once. </p> <p>Then, you get to decide if you want to stay on the planet and dig again or travel to a new planet and dig there.</p> <p> To stay and dig, press the letter <strong>‘A’</strong> on the keyboard. Try pressing it now! </p><p><img src='../static/images/task_images/land.jpg'  height='700' width='auto'></p>",
	 choices: ['A'],
   on_finish: function(data) {
    data.next_reward = 100.0;
    data.trial_type = "instruc_dig"
  }
 };

 var instructions_travel = {
   type: 'html-keyboard-response',
	 stimulus: "<p> The longer you mine a planet the fewer gems you’ll get with each dig.</p><p>When gems are running low, you may want to travel to a new planet that hasn’t been overmined. </p> <p>  Planets are very far apart in this galaxy, so it will take some time to travel between them. </p> <br><p> There are lots and lots of planets for you to visit, so you won’t be able to return to any planets you’ve already visited. </p><br><p>To leave this planet and travel to a new one, press the letter <strong>‘L’</strong> on the keyboard. Try pressing it now! </p><p><img src='../static/images/task_images/rocket-01.jpg'  height='600' width='auto'></p>",
	 choices: ['L'],
   button_html: ['<button id="close-image" style="border-radius: 10px;"><img src="../static/images/task_images/button-travel.jpg" height=80></button>'],
   on_finish: function(data) {
     data.trial_type = "instruc_travel";
   }
 };

 var instructions_alien = {
   type: 'html-keyboard-response',
   stimulus: '<p>When you arrive at a new planet, an alien from that planet will greet you!</p><p>[Press the <strong>space bar</strong> to continue] </p><br><p><img src="../static/images/task_images/aliens/alien_planet-125.jpg"  height="700" width="auto"></p>',
   choices: ['space'],
   on_finish: function(data) {
     data.trial_type = "instruc_alien_greet";
   }
 }

 var instructions_time_out = {
   type: 'html-keyboard-response',
   stimulus: '<p><p>If you’re not fast enough in making a choice, you’ll have to wait a few seconds before you can make another one.</p><p>You can’t dig for more gems or travel to new planets. You just have to sit and wait.</p><p>[Press the <strong>space bar</strong> to continue] </p><br><p><img src="../static/images/task_images/time_out.jpg"  height="700" width="auto"></p>',
   choices: ['space'],
   on_finish: function(data) {
     data.trial_type = "time_out";
   }
 }


var instructions_break = {
	type: 'html-keyboard-response',
	stimulus:  "<p> After digging and traveling for a while, you’ll be able to take a break at home base. </p> <p>You can spend at most 1 minute at home base — there are still a lot of gems left to collect! </p> <p>You will spend 30 minutes mining gems and traveling to new planets no matter what.</p><p>You will visit home base every 6 minutes, so, you will visit home base four times during the game.</p><p>[Press the <strong>space bar</strong> to continue] </p><br><img src='../static/images/task_images/home_base.jpg' height='700' width='auto'>",
  choices: ['space'],
  on_finish: function(data) {
    data.trial_type = "instruc_break";
  }
}

var instructions_practice_game = {
	type: 'html-keyboard-response',
	stimulus:"<p> Now, you'll play a practice game, so you can practice mining space treasure and traveling to new planets. </p> <p>In the practice game, you'll be digging up barrels of gems. But, in the real game, you'll be digging up the gems themselves. </p><p> Press the <strong>space bar</strong> to begin practice! </p>",
  choices: ['space'],
  on_finish: function(data){
    data.trial_type = "instruc_prac_game";
  }
}


 var instructions_begin_exp = {
	 type: 'html-button-response',
	 stimulus:'<p>Now that you know how  to dig for space treasure and travel to new planets, you can start exploring the universe! </p><p>Do you want to play the practice game again or get started with the real game?</p>',
	 choices: ['Practice game again','Move on to the real game'],
	 on_finish: function(data){
		 if (data.button_pressed == '0') {
			 jsPsych.addNodeToEndOfTimeline({
					timeline: [alien_welcome_prac,landing_prac,dig_prac,harvest_instruc,decision_prac],
				}, jsPsych.resumeExperiment);
        window.aliens_prac = [121,122,123,124];
				window.n_prac_rounds = n_prac_rounds + 1; // increase number of practice rounds they've done
				window.curr_prac_trial = 1; // reset current practice trial
		 } else {
			jsPsych.addNodeToEndOfTimeline({
				 timeline: [alien_welcome,landing,dig,harvest,decision],
			 }, jsPsych.resumeExperiment);
		 data.n_prac_rounds = n_prac_rounds;
		 window.block_start = Date.now();
		}
    data.trial_type = "instruc_begin_exp";
	 }
 };


var end_of_block = {
	type: 'html-keyboard-response',
	stimulus:"<p> You have been traveling for a while. Time to take a rest at home base! </p> <p> When you are ready to continue, press <strong>continue</strong>. </p><p><img src='../static/images/task_images/home_base.jpg' height='700' width='auto'>",
  choices: ['space'],
  stimulus_duration: 60000, // in milliseconds
  trial_duration: 60000,
  on_start: function(end_of_block) {
    var begin_para = "<p> You have been traveling for a while. Time to take a rest at home base! </p> <p> When you are ready to move one, press the <strong>space bar</strong>. </p>"
    var img = "<p><img src='../static/images/task_images/home_base.jpg' height='700' width='auto'></p>";
		var block_str = (b_num-1).toString();
		var home_base = "<p style='font-size:25px;'> Home Base Visit # ";
    var para_end = "</p>";
		var str_to_display = begin_para.concat(home_base,block_str,para_end,img);
		end_of_block.stimulus = str_to_display;
	},
	on_finish: function(data) {
    window.block_space_treasure = 0;
    data.trial_type = "end_of_block";
    jsPsych.addNodeToEndOfTimeline({
      timeline: [alien_welcome,landing,dig,harvest,decision],
    }, jsPsych.resumeExperiment);
    window.block_start = Date.now();
    save_data(false) //save data at end of block
	}
};

var end_of_experiment = {
	type: 'html-keyboard-response',
	stimulus:'<p> Congrats! You are done with the experiment!</p> <p> Make sure to submit your HIT! Press the <strong>space bar</strong> to quit. </p><br><br><p><img src="../static/images/task_images/opening_img-01.jpg"</p>',
  choices: ['space'],
  on_start: function(end_of_experiment) {
    var curr_bonus = Math.round(total_space_treasure*cents_per_gem);
    var bonus = Math.round(curr_bonus*10)/10;
    var begin_para = "<p> Congrats! You are done with the experiment!</p>";
    var begin_bonus = "<p> You made $6 plus $";
    var bonus_str = bonus.toString();
    var end_bonus = " in bonus payment!</p>";
    var end_para = "<p> You'll just answer some questions, and then, you will be finished! </p><p>Press the <strong>space bar</strong> to continue. </p><br><br><p><img src='../static/images/task_images/opening_img-01.jpg' height='600' width='auto'></p>"
    end_of_experiment.stimulus = begin_para.concat(begin_bonus,bonus_str,end_bonus,end_para)
    window.bonus = bonus;
  },
  on_finish: function(data) {
    data.bonus = bonus;
    data.num_failures = num_quiz_failures
    data.trial_type = "end_of_exp";
  }
};

var demographics = {
  type:'survey-html-form',
  html:"<p>How old are you in years? Enter '-1' if you would prefer not to respond.</p><input id='age' name='age' type='number' min='-1' style='height:45px; width:80px'/><div class='question'> <p class='questiontext'><br>What gender do you identify with?</p><select id='gender' name='gender'><option value='noresp' SELECTED></option><option value='female'>Female</option><option value='male'>Male</option><option value='other'>Other</option><option value='noresponse'>I'd prefer not to respond</option><select></div>",
  on_finish: function(data){
    data.trial_type = "demo"
  }
};

var quic_intro = {
  type:'survey-html-form',
  html:"The following questions will ask about your childhood. They will ask about the environment you grew up in and events you may have experienced.<br><br>",
  on_finish: function(data){
    data.trial_type = "quic_intro"
  }
};

var quic_options = ["Yes", "No", "Prefer not to answer"];

var quic_prior_12 = {
  type: 'survey-multi-choice',
  preamble: "<strong>Please answer these questions about your childhood prior to age 12.</strong>",
  questions: [{prompt: "I had a set morning routine on school days (i.e., I usually did the same thing each day to get ready).", options: quic_options, required: true},
               {prompt: "My parents kept track of what I ate (e.g., made sure that I didn’t skip meals or tried to make sure I ate healthy food).", options:quic_options, required:true},
               {prompt: "My family ate a meal together most days.", options: quic_options, required: true},
               {prompt: "My parents tried to make sure I got a good night’s sleep (e.g., I had a regular bedtime, my parents checked to make sure I went to sleep).", options: quic_options, required:true},
               {prompt:"I had a bedtime routine (e.g., my parents tucked me in, my parents read me a book, I took a bath).",options:quic_options, required:true},
               {prompt:"In my afterschool or free time hours at least one of my parents knew what I was doing", options:quic_options, required:true},
               {prompt:"At least one of my parents regularly checked that I did my homework",options:quic_options,required:true},
               {prompt:"My parents were often late to pick me up (e.g. from school, aftercare or sports).", options:quic_options, required:true},
               {prompt:"I usually knew when my parents were going to be home.", options:quic_options,required:true},
  ],
  on_finish: function(data){
    data.trial_type = "quic_prior_12"
  }
};

var quic_prior_18 = {
  type: 'survey-multi-choice',
  preamble: "<strong>Please answer these questions about your childhood prior to age 18.</strong>",
  questions: [{prompt:"At least one of my parents regularly kept track of my school progress",options:quic_options,required:true},
              {prompt:"At least one parent made time each day to see how I was doing",options:quic_options,required:true},
              {prompt:"At least one of my parents had punishments that were unpredictable",options:quic_options,required:true},
              {prompt:"I often wondered whether or not one of my parents would come home at the end of the day.",options:quic_options,required:true},
              {prompt:"My family planned activities to do together.",options:quic_options,required:true},
              {prompt:"At least one of my parents would plan something for the family, but then not follow through with the plan.",options:quic_options,required:true},
              {prompt:"My family had holiday traditions that we did every year (e.g., cooking a special food at a particular time of year/decorate the house the same way).",options:quic_options,required:true},
              {prompt:"At least one of my parents was disorganized",options:quic_options,required:true},
              {prompt:"At least one of my parents was unpredictable",options:quic_options,required:true},
              {prompt:"For at least one of my parents, when they were upset I did not know how they would act",options:quic_options,required:true},
              {prompt:"One of my parents could go from calm to furious in an instant",options:quic_options,required:true},
              {prompt:"One of my parents could go from calm to stressed or nervous in an instant",options:quic_options,required:true},
              {prompt:"There was a long period of time when I didn’t see one of my parents (e.g. military deployment, jail time, custody arrangements)",options:quic_options,required:true},
              {prompt:"I experienced changes in my custody arrangement",options:quic_options,required:true},
              {prompt:"At least one of my parents changed jobs frequently",options:quic_options,required:true},
              {prompt:"There were times when one of my parents was unemployed and couldn’t find a job even though he/she wanted one.",options:quic_options,required:true},
              {prompt:"My parents had a stable relationship with each other.",options:quic_options,required:true},
              {prompt:"My parents got divorced.",options:quic_options,required:true},
              {prompt:"At least one of my parents had many romantic partners",options:quic_options,required:true},
              {prompt:"There were often people coming and going in my house that I did not expect to be there",options:quic_options,required:true},
              {prompt:"I moved frequently",options:quic_options,required:true},
              {prompt:"I changed schools frequently",options:quic_options,required:true},
              {prompt:"I changed schools mid-year",options:quic_options,required:true},
              {prompt:"I lived in a clean house.",options:quic_options,required:true},
              {prompt:"I lived in a cluttered house (e.g., piles of stuff everywhere)",options:quic_options,required:true},
              {prompt:"In my house things I needed were often misplaced so that I could not find them",options:quic_options,required:true},
              {prompt:"There was a period of time when I often worried that I was not going to have enough food to eat",options:quic_options,required:true},
              {prompt:"There was a period of time when I often worried that my family would not have enough money to pay for necessities like clothing or bills",options:quic_options,required:true},
              {prompt:"There was a period of time when I did not feel safe in my home",options:quic_options,required:true},
  ],
  on_finish: function(data){
    data.trial_type = "quic_prior_18"
  }
};

var debrief = {
  type:'survey-html-form',
  html:"<p><strong>Below are some strategies you could've used in the game.</strong></p><p><br><strong>Let us know if you used the strategy, and if you did use it, when you used it (e.g. throughout the entire game, at the beginning only, block 3 only, etc.)</strong></p><br><br><p>I wanted to collect a total number of gems on each planet. I left once I collected that number.</p><input type='radio' name='planet_threshold' value='yes' checked> Yes<br><input type='radio' name='planet_threshold' value='no'> No<br><p>If yes, when did you use this strategy?</p><input type='text' name='planet_threshold_desc' size='400'><br><br><br><br><br><p>I wanted to collect a certain number of gems per dig. I left the planet once the actual number of gems per dig dropped below that number.</p><input type='radio' name='dig_threshold' value='yes' checked> Yes<br><input type='radio' name='dig_threshold' value='no'> No<br><p>If yes, when did you use this strategy?</p><input type='text'  name='dig_threshold_desc' size='400'><br><br><br><br><br><p>If I got more gems from a single dig than I expected, then I decided to stay. If I got less than expected, then I decided to leave.</p><input type='radio' name='surprise' value='yes' checked> Yes<br><input type='radio' name='surprise' value='no'> No<br><p>If yes, when did you use this strategy?<p><input type='text' name='surprise_desc' size='400'><br><br><br><br><br><p>If a planet seemed better than other planets, I stayed on that planet longer. If a planet seemed worse than other planets, I left that planet earlier.</p><input type='radio' name='dynamic' value='yes' checked> Yes<br><input type='radio' name='dynamic' value='no'> No<br><p>If yes, when did you use this strategy?</p><input type='text' name='dynamic_desc' size='400'><br><br><br><br><br><p>I used another strategy. (Please describe below)</p><input type='radio' name='other' value='yes' checked> Yes<br><input type='radio' name='other' value='no'> No<br><p>Describe your strategy. When did you use this strategy?</p><input type='text' name='other_desc' size='400'><br><br><br><br><br><p>Any comments and/or feedback on the game?</p><input type='text' name='feedback' size = 400><br><br><br>",
  on_finish: function(data){
    data.trial_type = "debrief"
  }
};


// Welcome to the experiment
timeline.push(welcome); // add variable welcome to end of timeline array

// introduce goal of the game
timeline.push(instructions_goal); // add variable welcome to end of timeline array

// Practice pressing Q to dig
timeline.push(instructions_dig); // add variable welcome to end of timeline array
timeline.push(dig_instruc);
timeline.push(harvest_instruc);

// Practice pressing P to travel
timeline.push(instructions_travel); // add variable welcome to end of timeline array
timeline.push(travel_prac);

// show an alien greeting them on new planet
timeline.push(instructions_alien)

// tell them about time out for responding slowly
timeline.push(instructions_time_out);

// Show them home base
timeline.push(instructions_break); // add variable welcome to end of timeline array

// quiz to check understanding
timeline.push(quiz_prac);


var all_images = [image_prefix+"land.jpg",image_prefix+"dig.jpg",image_prefix+"barrel_text.jpg",
image_prefix+"rocket-01.jpg",image_prefix+"rocket-02.jpg",image_prefix+"rocket-03.jpg",
image_prefix+"rocket-04.jpg",image_prefix+"rocket-05.jpg",image_prefix+"rocket-06.jpg",image_prefix+"rocket-07.jpg",
 image_prefix+"rocket-08.jpg",image_prefix+"rocket-09.jpg",image_prefix+"gems/0.jpg", image_prefix+"gems/1.jpg",
 image_prefix+"gems/2.jpg",image_prefix+"gems/3.jpg",image_prefix+"gems/4.jpg",image_prefix+"gems/5.jpg",
image_prefix+"gems/6.jpg",image_prefix+"gems/7.jpg",image_prefix+"gems/8.jpg",image_prefix+"gems/9.jpg",
image_prefix+"gems/10.jpg",image_prefix+"gems/11.jpg",image_prefix+"gems/12.jpg",image_prefix+"gems/13.jpg",
image_prefix+"gems/14.jpg",image_prefix+"gems/15.jpg",image_prefix+"gems/16.jpg",image_prefix+"gems/17.jpg",
image_prefix+"gems/18.jpg",image_prefix+"gems/19.jpg",image_prefix+"gems/20.jpg",image_prefix+"gems/21.jpg",
image_prefix+"gems/22.jpg",image_prefix+"gems/23.jpg",image_prefix+"gems/24.jpg",image_prefix+"gems/25.jpg",
image_prefix+"gems/26.jpg",image_prefix+"gems/27.jpg",image_prefix+"gems/28.jpg",image_prefix+"gems/29.jpg",
image_prefix+"gems/30.jpg",image_prefix+"gems/31.jpg",image_prefix+"gems/32.jpg",image_prefix+"gems/33.jpg",
image_prefix+"gems/34.jpg",image_prefix+"gems/35.jpg",image_prefix+"gems/36.jpg",image_prefix+"gems/37.jpg",
image_prefix+"gems/38.jpg",image_prefix+"gems/39.jpg",image_prefix+"gems/40.jpg",image_prefix+"gems/41.jpg",
image_prefix+"gems/42.jpg",image_prefix+"gems/43.jpg",image_prefix+"gems/44.jpg",image_prefix+"gems/45.jpg",
image_prefix+"gems/46.jpg",image_prefix+"gems/47.jpg",image_prefix+"gems/48.jpg",image_prefix+"gems/49.jpg",
image_prefix+"gems/50.jpg",image_prefix+"gems/51.jpg",image_prefix+"gems/52.jpg",image_prefix+"gems/53.jpg",
image_prefix+"gems/54.jpg",image_prefix+"gems/55.jpg",image_prefix+"gems/56.jpg",image_prefix+"gems/57.jpg",
image_prefix+"gems/58.jpg",image_prefix+"gems/59.jpg",image_prefix+"gems/60.jpg",image_prefix+"gems/61.jpg",
image_prefix+"gems/62.jpg",image_prefix+"gems/63.jpg",image_prefix+"gems/64.jpg",image_prefix+"gems/65.jpg",
image_prefix+"gems/66.jpg",image_prefix+"gems/67.jpg",image_prefix+"gems/68.jpg",image_prefix+"gems/69.jpg",
image_prefix+"gems/70.jpg",image_prefix+"gems/71.jpg",image_prefix+"gems/72.jpg",image_prefix+"gems/73.jpg",
image_prefix+"gems/74.jpg",image_prefix+"gems/75.jpg",image_prefix+"gems/76.jpg",image_prefix+"gems/77.jpg",
image_prefix+"gems/78.jpg",image_prefix+"gems/79.jpg",image_prefix+"gems/80.jpg",image_prefix+"gems/81.jpg",
image_prefix+"gems/82.jpg",image_prefix+"gems/83.jpg",image_prefix+"gems/84.jpg",image_prefix+"gems/85.jpg",
image_prefix+"gems/86.jpg",image_prefix+"gems/87.jpg",image_prefix+"gems/88.jpg",image_prefix+"gems/89.jpg",
image_prefix+"gems/90.jpg",image_prefix+"gems/91.jpg",image_prefix+"gems/92.jpg",image_prefix+"gems/93.jpg",
image_prefix+"gems/94.jpg",image_prefix+"gems/95.jpg",image_prefix+"gems/96.jpg",image_prefix+"gems/97.jpg",
image_prefix+"gems/98.jpg",image_prefix+"gems/99.jpg",image_prefix+"gems/100.jpg",image_prefix+"gems/101.jpg",
image_prefix+"gems/102.jpg",image_prefix+"gems/103.jpg",image_prefix+"gems/104.jpg",image_prefix+"gems/105.jpg",
image_prefix+"gems/106.jpg",image_prefix+"gems/107.jpg",image_prefix+"gems/108.jpg",image_prefix+"gems/109.jpg",
image_prefix+"gems/110.jpg",image_prefix+"gems/111.jpg",image_prefix+"gems/112.jpg",image_prefix+"gems/113.jpg",
image_prefix+"gems/114.jpg",image_prefix+"gems/115.jpg",image_prefix+"gems/116.jpg",image_prefix+"gems/117.jpg",
image_prefix+"gems/118.jpg",image_prefix+"gems/119.jpg",image_prefix+"gems/120.jpg",image_prefix+"gems/121.jpg",
image_prefix+"gems/122.jpg",image_prefix+"gems/123.jpg",image_prefix+"gems/124.jpg",image_prefix+"gems/125.jpg",
image_prefix+"gems/126.jpg",image_prefix+"gems/127.jpg",image_prefix+"gems/128.jpg",image_prefix+"gems/129.jpg",
image_prefix+"gems/130.jpg",image_prefix+"gems/131.jpg",image_prefix+"gems/132.jpg",image_prefix+"gems/133.jpg",
image_prefix+"gems/134.jpg",image_prefix+"gems/135.jpg",image_prefix+"opening_img-01.jpg",image_prefix+"home_base.jpg",
image_prefix+"time_out.jpg",image_prefix+"catch.jpg",image_prefix+"aliens/alien_planet-1.jpg",
image_prefix+"aliens/alien_planet-1.jpg",image_prefix+"aliens/alien_planet-2.jpg",image_prefix+"aliens/alien_planet-3.jpg",
image_prefix+"aliens/alien_planet-4.jpg",image_prefix+"aliens/alien_planet-5.jpg",image_prefix+"aliens/alien_planet-6.jpg",
image_prefix+"aliens/alien_planet-7.jpg",image_prefix+"aliens/alien_planet-8.jpg",image_prefix+"aliens/alien_planet-9.jpg",
image_prefix+"aliens/alien_planet-10.jpg",image_prefix+"aliens/alien_planet-11.jpg",image_prefix+"aliens/alien_planet-12.jpg",
image_prefix+"aliens/alien_planet-13.jpg",image_prefix+"aliens/alien_planet-14.jpg",image_prefix+"aliens/alien_planet-15.jpg",
image_prefix+"aliens/alien_planet-16.jpg",image_prefix+"aliens/alien_planet-17.jpg",image_prefix+"aliens/alien_planet-18.jpg",
image_prefix+"aliens/alien_planet-19.jpg",image_prefix+"aliens/alien_planet-20.jpg", image_prefix+"aliens/alien_planet-21.jpg",
image_prefix+"aliens/alien_planet-22.jpg",image_prefix+"aliens/alien_planet-23.jpg",image_prefix+"aliens/alien_planet-24.jpg",
image_prefix+"aliens/alien_planet-25.jpg",image_prefix+"aliens/alien_planet-26.jpg",image_prefix+"aliens/alien_planet-27.jpg",
image_prefix+"aliens/alien_planet-28.jpg",image_prefix+"aliens/alien_planet-29.jpg",image_prefix+"aliens/alien_planet-30.jpg",
image_prefix+"aliens/alien_planet-31.jpg",image_prefix+"aliens/alien_planet-32.jpg",image_prefix+"aliens/alien_planet-33.jpg",
image_prefix+"aliens/alien_planet-34.jpg",image_prefix+"aliens/alien_planet-35.jpg",image_prefix+"aliens/alien_planet-36.jpg",
image_prefix+"aliens/alien_planet-37.jpg",image_prefix+"aliens/alien_planet-38.jpg",image_prefix+"aliens/alien_planet-39.jpg",
image_prefix+"aliens/alien_planet-40.jpg",image_prefix+"aliens/alien_planet-41.jpg",image_prefix+"aliens/alien_planet-42.jpg",
image_prefix+"aliens/alien_planet-43.jpg",image_prefix+"aliens/alien_planet-44.jpg",image_prefix+"aliens/alien_planet-45.jpg",
image_prefix+"aliens/alien_planet-46.jpg",image_prefix+"aliens/alien_planet-47.jpg",image_prefix+"aliens/alien_planet-48.jpg",
image_prefix+"aliens/alien_planet-49.jpg",image_prefix+"aliens/alien_planet-50.jpg",image_prefix+"aliens/alien_planet-51.jpg",
image_prefix+"aliens/alien_planet-52.jpg",image_prefix+"aliens/alien_planet-53.jpg",image_prefix+"aliens/alien_planet-54.jpg",
image_prefix+"aliens/alien_planet-55.jpg",image_prefix+"aliens/alien_planet-56.jpg",image_prefix+"aliens/alien_planet-57.jpg",
image_prefix+"aliens/alien_planet-58.jpg",image_prefix+"aliens/alien_planet-59.jpg",image_prefix+"aliens/alien_planet-60.jpg",
image_prefix+"aliens/alien_planet-61.jpg",image_prefix+"aliens/alien_planet-62.jpg",image_prefix+"aliens/alien_planet-63.jpg",
image_prefix+"aliens/alien_planet-64.jpg",image_prefix+"aliens/alien_planet-65.jpg",image_prefix+"aliens/alien_planet-66.jpg",
image_prefix+"aliens/alien_planet-67.jpg", image_prefix+"aliens/alien_planet-68.jpg",image_prefix+"aliens/alien_planet-69.jpg",
image_prefix+"aliens/alien_planet-70.jpg",image_prefix+"aliens/alien_planet-71.jpg",image_prefix+"aliens/alien_planet-72.jpg",
image_prefix+"aliens/alien_planet-73.jpg",image_prefix+"aliens/alien_planet-74.jpg",image_prefix+"aliens/alien_planet-75.jpg",
image_prefix+"aliens/alien_planet-76.jpg",image_prefix+"aliens/alien_planet-77.jpg",image_prefix+"aliens/alien_planet-78.jpg",
image_prefix+"aliens/alien_planet-79.jpg",image_prefix+"aliens/alien_planet-80.jpg",image_prefix+"aliens/alien_planet-81.jpg",
image_prefix+"aliens/alien_planet-82.jpg",image_prefix+"aliens/alien_planet-83.jpg",image_prefix+"aliens/alien_planet-84.jpg",
image_prefix+"aliens/alien_planet-85.jpg",image_prefix+"aliens/alien_planet-86.jpg",image_prefix+"aliens/alien_planet-87.jpg",
image_prefix+"aliens/alien_planet-88.jpg",image_prefix+"aliens/alien_planet-89.jpg",image_prefix+"aliens/alien_planet-90.jpg",
image_prefix+"aliens/alien_planet-91.jpg",image_prefix+"aliens/alien_planet-92.jpg",image_prefix+"aliens/alien_planet-93.jpg",
image_prefix+"aliens/alien_planet-94.jpg",image_prefix+"aliens/alien_planet-95.jpg",image_prefix+"aliens/alien_planet-96.jpg",
image_prefix+"aliens/alien_planet-97.jpg",image_prefix+"aliens/alien_planet-98.jpg",image_prefix+"aliens/alien_planet-99.jpg",
image_prefix+"aliens/alien_planet-100.jpg",image_prefix+"aliens/alien_planet-101.jpg",image_prefix+"aliens/alien_planet-102.jpg",
image_prefix+"aliens/alien_planet-103.jpg",image_prefix+"aliens/alien_planet-104.jpg",image_prefix+"aliens/alien_planet-105.jpg",
image_prefix+"aliens/alien_planet-106.jpg",image_prefix+"aliens/alien_planet-107.jpg",image_prefix+"aliens/alien_planet-108.jpg",
image_prefix+"aliens/alien_planet-109.jpg",image_prefix+"aliens/alien_planet-110.jpg",image_prefix+"aliens/alien_planet-111.jpg",
image_prefix+"aliens/alien_planet-112.jpg",image_prefix+"aliens/alien_planet-113.jpg",image_prefix+"aliens/alien_planet-114.jpg",
image_prefix+"aliens/alien_planet-115.jpg",image_prefix+"aliens/alien_planet-116.jpg",image_prefix+"aliens/alien_planet-117.jpg",
image_prefix+"aliens/alien_planet-118.jpg",image_prefix+"aliens/alien_planet-119.jpg",image_prefix+"aliens/alien_planet-120.jpg",
image_prefix+"aliens/alien_planet-121.jpg",image_prefix+"aliens/alien_planet-122.jpg",image_prefix+"aliens/alien_planet-123.jpg",
image_prefix+"aliens/alien_planet-124.jpg",image_prefix+"aliens/alien_planet-125.jpg"];



var prompt_resubmit = function() {
		document.body.innerHTML = error_message;
		$("#resubmit").click(resubmit);
	};

var resubmit = function() {
		document.body.innerHTML = "<h1>Trying to resubmit...</h1>";
		reprompt = setTimeout(prompt_resubmit, 10000);

		psiTurk.saveData({
			success: function() {
			    clearInterval(reprompt);
          psiturk.completeHIT(); // when finished saving compute bonus, the quit
			},
			error: prompt_resubmit
		});
	};

var save_data = function(final) {
  // exclude unwanted keys/columns
  var exclude_keys = ['internal_node_id','trial_index', 'animation_sequence','success','stimulus'];
  var clean_data = jsPsych.data.get().ignore(exclude_keys);
  var callback = function() {
    if (final) {
      // submit the HIT
      psiturk.saveData({
            success: function(){
              psiturk.completeHIT(); // when finished saving compute bonus, the quit
            },
            error: prompt_resubmit});
    }
  }
  /* Save participant data file */

  // Set participant data file name
  if (debug_mode) {
    var data_file_name = "dev_test.csv";

  } else {
    //var timestamp = (new Date).toISOString().replace(/z|t/gi,' ').trim();
  //  var data_file_name =  'S_' + subject_id +'-'+timestamp +'.csv';
    var data_file_name =  'S_' + subject_id + '.csv';
  }

  // Save participant data file as a download in the web browser
  // Note that unlike saving server-side, this doesn't remove quotation marks from the CSV file
  if (data_save_method == 'csv_client') {
    clean_data.localSave('csv', data_file_name);
    // Save participant data file on a server side directory via PHP
    // (Broken: only works with Apache + PHP and no psiTurk)
  } else if(data_save_method == 'csv_server_php') {
    saveData(data_file_name, clean_data.csv())
    // Save participant data file on a server side directory via Python (only works with psiTurk)
  }  else if(data_save_method == 'csv_server_py') {
    $.ajax({
      type: 'POST',
      url: "../save_data_file",
      dataType: 'json',
      success: callback,
      error: callback,
      data: {
        file_name: data_file_name,
        file_data: clean_data.csv(),
      },
    });
  }
}

  jsPsych.init({
    timeline: timeline,
    preload_images: all_images,
    max_load_time: 600000,
    on_finish: function() {
      /* Retrieve the participant's data from jsPsych */
      // Determine and save participant bonus payment
      psiturk.recordUnstructuredData("bonus", bonus);
      psiturk.recordUnstructuredData("subject_id", subject_id);

      save_data(true)
    },
  })
