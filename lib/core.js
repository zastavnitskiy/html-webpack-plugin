/**
 * This file contains the entire flow step by step to create the html asset
 */
// @ts-check
/* eslint-disable */
/// <reference path="../typings.d.ts" />
/* eslint-enable */
/** @typedef {import("webpack/lib/Compilation.js")} WebpackCompilation */
'use strict';

const { generatedScriptTags, generateStyleTags, generatedMetaTags, generateFaviconTags, generateAssetGroups } = require('./tag-generators');
const { getAssetsFromCompilation } = require('./asset-extractor');
const { renderHtml, injectTagsIntoHtml } = require('./render-html');

/**
 * The html-webpack-plugin core method
 *
 * It will produce several side effects:
 *   + firering third-party-plugin events
 *   + adding favicons to the webpack compilation
 *   + adding html assets to the webpack compilation
 *
 * @param {WebpackCompilation} compilation
 * @param {import("./hooks.js").HtmlWebpackPluginHooks} hooks
 * @param {string} outputName
 * @param {import("../index.js")} htmlPluginInstance
 */
module.exports = function generateHtmlWebpackPluginContent(compilation, hooks, outputName, htmlPluginInstance) {

  // The html-webpack plugin uses a object representation for the html-tags which will be injected
  // to allow altering them more easily
  // Just before they are converted a third-party-plugin author might change the order and content
  const beforeAssetTagGenerationPromise = hooks.beforeAssetTagGeneration.promise({
    assets: getAssetsFromCompilation(compilation, htmlPluginInstance.options),
    outputName,
    plugin: htmlPluginInstance
  });

  // Turn the js and css paths to HtmlTagObjects
  const assetTagsPromise = beforeAssetTagGenerationPromise.then(({assets}) => {
    return {
        assetTags: {
          scripts: generatedScriptTags(assets.js),
          styles: generateStyleTags(assets.css),
          meta: generatedMetaTags(htmlPluginInstance.options.meta),
          favicons: generateFaviconTags(htmlPluginInstance.options.favicon),
        }
    };
  });

  // Allow third-party-plugin authors to reorder and change the assetTags before they are grouped
  const alterAssetTagsPromise = assetTagsPromise.then(({assetTags}) => {
    return hooks.alterAssetTags.promise({
        assetTags,
        outputName,
        plugin: htmlPluginInstance
      })});

  const assetTagGroupsPromise = alterAssetTagsPromise.then(({assetTags}) => {
    // Inject scripts to body unless it set explictly to head
    const scriptTarget = htmlPluginInstance.options.inject === 'head' ? 'head' : 'body';
    // Group assets to `head` and `body` tag arrays
    return generateAssetGroups(assetTags, scriptTarget);
  });

  // Allow third-party-plugin authors to reorder and change the assetTags ounce they are grouped
  const alterAssetTagGroupsPromise = assetTagGroupsPromise.then(({headTags, bodyTags}) => {
    return hooks.alterAssetTagGroups.promise({
      headTags,
      bodyTags,
      outputName,
      plugin: htmlPluginInstance
    })});

  // Execute the templates for the given output name
  const generateHtmlPromise = Promise.all([beforeAssetTagGenerationPromise, alterAssetTagGroupsPromise])
    .then(([{assets}, {headTags, bodyTags}]) => {
      const templateValues = htmlPluginInstance.getTemplateParameters(compilation, {...assets, headTags, bodyTags});
      return { html: renderHtml(templateFunction, templateValues) };
    });

  // Allow third-party-plugin authors to alter the html after the template was executed
  const afterTemplateExecutionPromise = Promise.all([generateHtmlPromise, assetTagGroupsPromise])
    .then(([ { html }, { headTags, bodyTags } ]) => {
      return hooks.afterTemplateExecution.promise({
        html,
        headTags,
        bodyTags,
        outputName,
        plugin: htmlPluginInstance
      });
    });


  // Add all html-tags to the template
  const htmlInjectionPromise = afterTemplateExecutionPromise.then(({html, headTags, bodyTags}) => {
    let injectedHtml = html;
    if (!htmlPluginInstance.options.inject) {
       injectedHtml = injectTagsIntoHtml(html, {headTags, bodyTags}, htmlPluginInstance.options.xhtml);
    }
    return {
      html: injectedHtml
    };
  });

  const beforeEmitPromise = htmlInjectionPromise.then(({html}) => {
    return hooks.beforeEmit.promise({
        html,
        outputName,
        plugin: htmlPluginInstance
    })
  });

  const emitPromise = beforeEmitPromise.then(({html}) => {
    return emitHtmlAsset({html, outputName});
  });

  const afterEmitPromise = emitPromise.then(() => {
    return hooks.afterEmit.promise({
      outputName,
      plugin: htmlPluginInstance
    });
  });

  return afterEmitPromise;
}
