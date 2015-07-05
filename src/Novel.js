var Visuals = require('./Visuals.js');

/**
 * @fileoverview Core novel class
 * @module eVN/Novel
 * @param {object} canvas - The canvas element to attach.
 * @param {string} eVNML - The eVN script to load. <b>Must be valid JSON!</b>
 * @param {string} [file] - The name of the .evn script passed.
 */
module.exports = function Novel(canvas, eVNML, file) {
	this.file = file || 'undefined';
	
	/** The canvas attached to the instance */
	this.canvas = canvas;
	/** The drawing context of {@link module:eVN/Novel.canvas} */
	this.context = canvas.getContext('2d');

	/* Add the CSS class `eVN-canvas` to the canvas */
	//this.canvas.classList.add('eVN-canvas');
	this.canvas.className = this.canvas.className + ' eVN-canvas';

	/** Map containing dynamic data for handling the current scene */
	this.cdata = {
		background: null,
		characters: [],
		collection: 'start',
		collectionIndex: 0,
		dialogue: '',
		dialogueLines: [],
		mouseX: -1,
		mouseY: -1,
		jobs: [],
		startLine: 0,
		speaker: ''
	};

	/** Object containing simple character instances */
	this.characters = {};

	/**
	 * An instance that controls all graphic/drawing related stuff for the novel.
	 * @see module:eVN/Visuals
	 */
	this.visuals = new Visuals(this);
	
	/** JSON object containing all end-developer input (from .evn scripts) */
	this.eVNML = this.parse_eVNML(eVNML);

	/* Create an Image() from the passed textbox and optional speakerbox objects */
	if(this.eVNML.options.textbox.image) {
		this.textboxImage = new Image();
		this.textboxImage.src = this.eVNML.options.textbox.image;
	}
	if(this.eVNML.options.textbox.speakerbox.image) {
		this.speakerboxImage = new Image();
		this.speakerboxImage.src = this.eVNML.options.textbox.speakerbox.image;
	}

	/* Cache this.cdata to a lexical closure so anonymous functions can access it */
	var cdata = this.cdata;

	/* Go to the next scene on regular click */
	var _this = this;
	this.canvas.addEventListener('click', function onCanvasClick() {_this.parseScene.call(_this);});

	this.canvas.addEventListener('mousemove', function onMouseMove(e) {
		var target = e.target || e.srcElement;
		var rect = target.getBoundingClientRect();
		/* Two variables to modify the mouse coords relative to the scaling of the canvas */
		var fsModX = rect.width / target.width;
		var fsModY = rect.height / target.height;
		/* Export to Novel.cdata */
		cdata.mouseX = (e.clientX - rect.left) / fsModX |0;
		cdata.mouseY = (e.clientY - rect.top) / fsModY |0;
	});

	var cd = this.cdata;

	/* Import images */
	this.images = {};
	for(var imgKeys in this.eVNML.images) {
		this.images[imgKeys] = new Image();
		this.images[imgKeys].src = this.eVNML.images[imgKeys];
	}

	/* Instantiate characters */
	for(var key in this.eVNML.characters) {
		var eVNML_char = this.eVNML.characters[key];
		this.characters[key] = {
			name: eVNML_char['first name'] || eVNML_char['name'],
			lname: eVNML_char['last name'],
			color: eVNML_char['color'] || eVNML_char['colour'],
			images: {}
		};
		var char = this.characters[key];

		for(var imgKey in eVNML_char.images) {
			char.images[imgKey] = /*new Image();
			char.images[imgKey].src =*/ eVNML_char.images[imgKey];
		}
		char.cImage = char.images.default;
	}

	this.parseScene(cd.currentCollection, cd.collectionIndex);

	/* Push ourself to an array for easy debugging/hacking */
	var instanceIndex = eVN.instances.push(this) - 1;
	eVN.logger.log('Created new eVN instance from file `' + this.file + '` under eVN.instances['+ instanceIndex +']');
};

module.exports.prototype = {
	/** Validates the end-developer input and applies it on top of a set of default values */
	parse_eVNML: function(eVNML) {
		var defaults = require('./defaults.evn');
		var userData = eVNML;
		var returned_eVNML = defaults;

		try {
			userData = JSON.parse(eVNML);

			/**
			 * Returns an object of <code>alpha</code> obtrusively laid on top of <code>beta</code>
			 * param {object} alpha - The obtrusive object literal to apply on top of <code>beta</code>
			 * param {object beta - The submissive object literal to use as base for <code>alpha</code>
			 * returns {object}
			 */
			var merge = function(alpha, beta) {
				var out = beta;
				for(var prop in alpha) {
					if( !(prop in beta) ) out[prop] = alpha[prop];

					// If both properties are object literals, try merging those
					else if( alpha[prop].constructor === Object && beta[prop].constructor === Object) {
						out[prop] = merge(alpha[prop], beta[prop]);

					// Warn the end-developer if he possibly made a type mistake
					} else if ( alpha[prop].constructor !== beta[prop].constructor ) {
						eVN.logger.warn('Possible type mismatch on property "'+prop+'" while parsing eVNML.');
						out[prop] = alpha[prop];

					// Fall back to just overwriting the property
					}  else out[prop] = alpha[prop];
				}

				return out;
			};
			returned_eVNML = merge(userData, defaults);
		} catch(e) {
			eVN.logger.throw(e);
		}
	
		return returned_eVNML;
	},

	/**
	 * Imports `scene` to {@link module:eVN/Novel.cdata} and determines what to do with it
	 * @param {Object} scene - The scene to import
	 * @see <eVNML scene syntax>
	 */
	parseScene: function(collection, index) {
		var cd = this.cdata;
		var eVNML = this.eVNML;
		var textbox = eVNML.options.textbox;
		collection = collection || cd.collection;
		index = (typeof index !== 'undefined')? index : cd.collectionIndex;

		if(cd.startLine + textbox.lines < cd.dialogueLines.length) return cd.startLine += textbox.lines;

		var scene = this.eVNML.scenes[collection][index];
		cd.collection = collection;
		cd.collectionIndex = index+1;
		if(!scene) eVN.logger.throw('Undefined scene "'+ collection +'['+ index +']"! Did we run out of scenes?');

		/* These are values that only live one scene - they should be reset on each scene load */
		cd.speakerColor = null;

		/* If the scene is a string, it's using the dialogue shorthand */
		if(typeof scene === 'string') {
			var splitAt = scene.indexOf(': ');
			var alpha = scene.slice(0, splitAt);
			var beta = scene.slice(splitAt+2);

			/* If the alpha exists as a key in the characters object, it's dialogue, if not monologue */
			var isDialogue = splitAt < scene.indexOf(' ')   &&   alpha in this.characters;
			scene = isDialogue? ["say", beta, alpha] : ["say", scene];
		}

		switch(scene[0].toLowerCase()) {
		/* Cases ending with 'break' will not take up a scene shift and jump to the next scene automatically.
		   Cases ending with 'return' will not jump to the next scene when done */

			case 'background':
				cd.background = scene[1];
				break;
			case 'say':
				/*Process inline variables for text*/
				var text = this.processVariables(scene[1]);

				if(scene[2]) {
					cd.speaker = scene[2];
					cd.dialogue = '"'+ text +'"';
					cd.speakerColor = scene[3] || null;
				} else {
					cd.speaker = null;
					cd.dialogue = text;
				}

				//var maxWidth = this.context.canvas.width - (textbox.margin*2 + textbox.padding*2);
				var maxWidth = textbox.maxWidth;
				cd.dialogueLines = this.visuals.text.split(this.context, cd.dialogue, textbox.font.size, maxWidth);
				cd.startLine = 0;
				return;
			case 'setmood':
				var charIndex = -1;
				for(var i=0,l=cd.characters.length; i<l; i++) {
					if(cd.characters[i]['character'] === scene[1]) {
						charIndex = i;
						break;
					}
				}
				if(charIndex > -1){
					cd.characters[charIndex].mood = scene[2] || 'default';
				}
				break;
			case 'hide':
				cd.characters[scene[1]] = null;
				break;
			case 'show':
				/* Since characters are stored in an array and not an object literal,
				   checking if it exists takes a little extra effort */

				/* Check if we already have an index mapped to scene[1]||charName */
				var charIndex = -1;
				for(var i=0,l=cd.characters.length; i<l; i++) {
					if(cd.characters[i]['character'] === scene[1]) {
						charIndex = i;
						break;
					}
				}

				if(charIndex > -1) {
					var cdChar = cd.characters[charIndex];
					cdChar = {
						character: cdChar.character,
						position: scene[2] || cdChar.position || 'middle',
						mood: cdChar.mood || 'default',
						priority: scene[4] || cdChar.priority || 1
					};
				} else {
					cd.characters.push({ character: scene[1], position: scene[2]||'middle', mood: 'default' });
				}
				break;
			case 'goto':
			case 'jump':
				cd.collection = scene[1];
				cd.collectionIndex = 0;
				break;
			default:
				eVN.logger.warn('Unknown command "'+ scene[0] +'" at "'+ collection +'['+ index +']"');
		}

		this.parseScene();
	},

	/**
	 * Looks for ${varName} variables and returns the processed string
	 * @param {string} string - the string to process
	 */
	processVariables: function(string) {
		var splitAt = string.indexOf('${');
		var endAt = string.indexOf('}', splitAt);
		var output;
		if(splitAt !== -1   &&   endAt !== -1){
			var alpha = string.slice(0, splitAt);
			var beta = string.slice(splitAt+2, endAt);
			var gamma = string.slice(endAt+1);

			output = alpha +'Uncle Touchy'+ gamma;
			if(output.indexOf('${') !== -1) return this.processVariables(output);
			return output;
		} else {
			return string;
		}
	},

	/**
	 *
	 */
	constructCharacter: function(data) {
		var name = data.name;
		this.characters[name] = {};
	}
};