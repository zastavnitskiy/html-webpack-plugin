/**
 * This file generates the tags which will be injected into the html document
 */
// @ts-check
/* eslint-disable */
/// <reference path="../typings.d.ts" />
/* eslint-enable */
/** @typedef {import("webpack/lib/Compilation.js")} WebpackCompilation */
'use strict';

/**
 * Generate all tags script for the given file paths
 * @param {Array<{ entryName: string; path: string; }>} jsAssets
 * @returns {Array<HtmlTagObject>}
 */
function generatedScriptTags(jsAssets) {
  return jsAssets.map(scriptAsset => ({
    tagName: 'script',
    voidTag: false,
    entry: scriptAsset.entryName,
    attributes: {
      src: scriptAsset.path
    }
  }));
}

/**
 * Generate all style tags for the given file paths
 * @param {Array<{ entryName: string; path: string; }>} cssAssets
 * @returns {Array<HtmlTagObject>}
 */
function generateStyleTags(cssAssets) {
  return cssAssets.map(styleAsset => ({
    tagName: 'link',
    voidTag: true,
    entry: styleAsset.entryName,
    attributes: {
      href: styleAsset.path,
      rel: 'stylesheet'
    }
  }))
}

/**
 * Generate all meta tags for the given meta configuration
 * @param {false | {
          [name: string]: string|false // name content pair e.g. {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'}`
          | {[attributeName: string]: string|boolean} // custom properties e.g. { name:"viewport" content:"width=500, initial-scale=1" }
      }} metaOptions
 * @returns {Array<HtmlTagObject>}
 */
function generatedMetaTags(metaOptions) {
    if (metaOptions === false) {
      return [];
    }
    // Make tags self-closing in case of xhtml
    // Turn { "viewport" : "width=500, initial-scale=1" } into
    // [{ name:"viewport" content:"width=500, initial-scale=1" }]
    const metaTagAttributeObjects = Object.keys(metaOptions)
    .map((metaName) => {
      const metaTagContent = metaOptions[metaName];
      return (typeof metaTagContent === 'string') ? {
        name: metaName,
        content: metaTagContent
      } : metaTagContent;
    })
    .filter((attribute) => attribute !== false);
    // Turn [{ name:"viewport" content:"width=500, initial-scale=1" }] into
    // the html-webpack-plugin tag structure
    return metaTagAttributeObjects.map((metaTagAttributes) => {
      if (metaTagAttributes === false) {
        throw new Error('Invalid meta tag');
      }
      return {
        tagName: 'meta',
        voidTag: true,
        attributes: metaTagAttributes
      };
    });
}

/**
 * Generate a favicon tag for the given file path
 * @param {string| false} faviconPath
 * @returns {Array<HtmlTagObject>}
 */
function generateFaviconTags(faviconPath) {
  if (faviconPath === false) {
    return [];
  }
  return [{
    tagName: 'link',
    voidTag: true,
    attributes: {
      rel: 'shortcut icon',
      href: faviconPath
    }
  }];
}

/**
 * Group assets to head and bottom tags
 *
 * @param {{
    scripts: Array<HtmlTagObject>;
    styles: Array<HtmlTagObject>;
    meta: Array<HtmlTagObject>;
    favicons: Array<HtmlTagObject>;
  }} assetTags
 * @param {"body" | "head"} scriptTarget
 * @returns {{
    headTags: Array<HtmlTagObject>;
    bodyTags: Array<HtmlTagObject>;
  }}
 */
function generateAssetGroups(assetTags, scriptTarget) {
  /** @type {{ headTags: Array<HtmlTagObject>; bodyTags: Array<HtmlTagObject>; }} */
  const result = {
    headTags: [
      ...assetTags.meta,
      ...assetTags.favicons,
      ...assetTags.styles
    ],
    bodyTags: []
  };
  // Add script tags to head or body depending on
  // the htmlPluginOptions
  if (scriptTarget === 'body') {
    result.bodyTags.push(...assetTags.scripts);
  } else {
    result.headTags.push(...assetTags.scripts);
  }
  return result;
}

module.exports = {
  generatedScriptTags,
  generateStyleTags,
  generatedMetaTags,
  generateFaviconTags,
  generateAssetGroups
}
