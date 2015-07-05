/**
 * eVN - Everyone's Visual Novel (Development build)
 * @see {@link https://github.com/bytesizedpacket/eVN}
 * @fileOverview eVN core script
 * @author Jacob Pedersen <jacob@bytesizedpacket.com> & Byte-Sized Packet <contact@bytesizedpacket.com>
 * @copyright Byte-Sized Packet 2015
 * @license {@link https://github.com/bytesizedpacket/eVN/blob/master/LICENSE | Attribution Assurance License (BSP edit)}
 * @version: 0.0.1a Pre-development version
 */

/* Import some modules */
var Logger = require('./Logger.js');
var onPageLoad = require('./onPageLoad.js');
var Novel = require('./Novel.js');

/** @namespace eVN */
window.eVN = window.eVN || {};

/** Version */
eVN.VERSION = '0.0.1a';


/** @see module:eVN/Logger */
eVN.logger = new Logger('eVN Logger', eVN.VERSION, true);

/** @see module:eVN/onPageLoad */
eVN.onPageLoad = onPageLoad;

/**
 * Stylesheet used for adding fonts and full-screen styles.
 * You can insert your own style tag with the id `eVN-stylesheet` and it'll use that.
 * <i>This lets you generate a nonce hash and apply it to achieve CSP compliance!</i>
 * @see {@link http://www.html5rocks.com/en/tutorials/security/content-security-policy/#inline-code-considered-harmful}
 */
eVN.stylesheet = (function() {
	/* If a tag with the id `eVN-stylesheet` exists, we'll assume it's a <style> tag we can use for injecting rules
	   This lets end-developers insert their own <style> tag with a `nonce=` attribute if they need CSP compliance. */
	var stylesheet = document.getElementById('eVN-stylesheet') || document.createElement('style');
	document.head.appendChild(stylesheet);
	return stylesheet.sheet;
})();

/** Instances (for debugging/hacking) */
eVN.instances = [];

/**
 * Class for handling novels
 * @see eVN.NovelClass
 */
eVN.Novel = Novel;



/* Execute our onPageLoad() function as soon as the browser has everything loaded */
document.addEventListener('DOMContentLoaded', eVN.onPageLoad);

setTimeout(function(){window.t=eVN.instances[0];}, 500);