// @ts-check
/* eslint-disable */
/// <reference path="../typings.d.ts" />
/* eslint-enable */
/** @typedef {import("webpack/lib/Compilation.js")} WebpackCompilation */
/** @typedef {import("webpack/lib/Compiler.js")} WebpackCompiler */
/** @typedef {import("webpack/lib/Chunk.js")} WebpackChunk */
/** @typedef {(data: any)=>string} TemplateFunction */
'use strict';

const htmlTagObjectToString = require('./html-tags').htmlTagObjectToString;

/**
 * @param {TemplateFunction} templateFunction
 * @param {any} templateValues
 * @returns {string}
 */
function renderHtml(templateFunction, templateValues) {
  return templateFunction(templateValues);
}

/**
 * Places the tags into the html
 * @param {string} html
 * @param {{
    headTags: Array<HtmlTagObject>;
    bodyTags: Array<HtmlTagObject>;
  }} assetTags
 * @param {boolean} xhtml
 * @returns {string}
 */
function injectTagsIntoHtml(html, assetTags, xhtml) {
  const htmlRegExp = /(<html[^>]*>)/i;
    const headRegExp = /(<\/head\s*>)/i;
    const bodyRegExp = /(<\/body\s*>)/i;
    const body = assetTags.headTags.map((assetTagObject) => htmlTagObjectToString(assetTagObject, xhtml));
    const head = assetTags.bodyTags.map((assetTagObject) => htmlTagObjectToString(assetTagObject, xhtml));

    if (body.length) {
      if (bodyRegExp.test(html)) {
        // Append assets to body element
        html = html.replace(bodyRegExp, match => body.join('') + match);
      } else {
        // Append scripts to the end of the file if no <body> element exists:
        html += body.join('');
      }
    }

    if (head.length) {
      // Create a head tag if none exists
      if (!headRegExp.test(html)) {
        if (!htmlRegExp.test(html)) {
          html = '<head></head>' + html;
        } else {
          html = html.replace(htmlRegExp, match => match + '<head></head>');
        }
      }

      // Append assets to head element
      html = html.replace(headRegExp, match => head.join('') + match);
    }

    return html;
}

/**
 * Inject an appcache file into the opening html tag
 *
 * @param {string} manifest
 * @param {string} html
 */
function injectManifest(manifest, html) {
    if (!manifest) {
      return html;
    }
    // Inject manifest into the opening html tag
    html = html.replace(/(<html[^>]*)(>)/i, (match, start, end) => {
      // Append the manifest only if no manifest was specified
      if (/\smanifest\s*=/.test(match)) {
        return match;
      }
      return start + ' manifest="' + manifest + '"' + end;
    });
}

module.exports = {
  renderHtml,
  injectManifest,
  injectTagsIntoHtml,
}
