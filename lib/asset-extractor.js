// @ts-check
/** @typedef {import("webpack/lib/Compilation.js")} WebpackCompilation */
/** @typedef {import("webpack/lib/Compiler.js")} WebpackCompiler */
/** @typedef {import("webpack/lib/Chunk.js")} WebpackChunk */
/** @typedef {(entryNameA: string, entryNameB: string) => number} SortFunction */
/**
 * @file
 * This file extracts all asset information from a given compilation
 *
 */
'use strict';
const path = require('path');
const chunkSorter = require('./chunksorter');

/**
 * Returns the sorted and filtered entry names
 * The entry name is are the ones from the webpack config entry option
 *
 * @param {WebpackCompilation} compilation
 * @param {HtmlWebpackPluginOptions} htmlPluginOptions
 */
function getSortedEntryNamesCompilation(compilation, htmlPluginOptions) {
  // Get all entry point names for this html file
  const entryNames = Array.from(compilation.entrypoints.keys());
  const filteredEntryNames = filterChunks(entryNames, htmlPluginOptions.chunks, htmlPluginOptions.excludeChunks);
  const sortedEntryNames = sortEntryChunks(filteredEntryNames, htmlPluginOptions.chunksSortMode, compilation);
  return sortedEntryNames;
}



/**
 * Helper to sort chunks
 * @param {string[]} entryNames
 * @param {string | SortFunction} sortMode
 * @param {WebpackCompilation} compilation
 */
function sortEntryChunks (entryNames, sortMode, compilation) {
  // Custom function
  if (typeof sortMode === 'function') {
    // If it's a function which expects exactly two arguments
    // use it as Array.prototype.sort function
    return entryNames.sort(sortMode);
  }
  // Check if the given sort mode is a valid chunkSorter sort mode
  if (typeof chunkSorter[sortMode] !== 'undefined') {
    return chunkSorter[sortMode](entryNames, compilation, this.options);
  }
  throw new Error('"' + sortMode + '" is not a valid chunk sort mode');
}

/**
 * Return all chunks from the compilation result which match the exclude and include filters
 * @param {any} chunks
 * @param {string[]|'all'} includedChunks
 * @param {string[]} excludedChunks
 */
function filterChunks (chunks, includedChunks, excludedChunks) {
  return chunks.filter(chunkName => {
    // Skip if the chunks should be filtered and the given chunk was not added explicity
    if (Array.isArray(includedChunks) && includedChunks.indexOf(chunkName) === -1) {
      return false;
    }
    // Skip if the chunks should be filtered and the given chunk was excluded explicity
    if (Array.isArray(excludedChunks) && excludedChunks.indexOf(chunkName) !== -1) {
      return false;
    }
    // Add otherwise
    return true;
  });
}


/**
 * The htmlWebpackPluginAssets extracts the asset information of a webpack compilation
 * for all given entry names
 * @param {WebpackCompilation} compilation
 * @param {string[]} entryNames
 * @returns {{
    publicPath: string,
    js: Array<{entryName: string, path: string}>,
    css: Array<{entryName: string, path: string}>,
    manifest?: string,
    favicon?: string
  }}
 */
function htmlWebpackPluginAssets (compilation, entryNames) {
  const compilationHash = compilation.hash;

  /**
   * @type {string} the configured public path to the asset root
   * if a publicPath is set in the current webpack config use it otherwise
   * fallback to a realtive path
   */
  let publicPath = typeof compilation.options.output.publicPath !== 'undefined'
    // If a hard coded public path exists use it
    ? compilation.mainTemplate.getPublicPath({hash: compilationHash})
    // If no public path was set get a relative url path
    : path.relative(path.resolve(compilation.options.output.path, path.dirname(this.childCompilationOutputName)), compilation.options.output.path)
      .split(path.sep).join('/');

  if (publicPath.length && publicPath.substr(-1, 1) !== '/') {
    publicPath += '/';
  }

  /**
   * @type {{
      publicPath: string,
      js: Array<{entryName: string, path: string}>,
      css: Array<{entryName: string, path: string}>,
      manifest?: string,
      favicon?: string
    }}
    */
  const assets = {
    // The public path
    publicPath: publicPath,
    // Will contain all js files
    js: [],
    // Will contain all css files
    css: [],
    // Will contain the html5 appcache manifest files if it exists
    manifest: Object.keys(compilation.assets).find(assetFile => path.extname(assetFile) === '.appcache'),
    // Favicon
    favicon: undefined
  };

  // Append a hash for cache busting
  if (this.options.hash && assets.manifest) {
    assets.manifest = this.appendHash(assets.manifest, compilationHash);
  }

  // Extract paths to .js and .css files from the current compilation
  const extensionRegexp = /\.(css|js)(\?|$)/;
  for (let i = 0; i < entryNames.length; i++) {
    const entryName = entryNames[i];
    const entryPointFiles = compilation.entrypoints.get(entryName).getFiles();
    // Prepend the publicPath and append the hash depending on the
    // webpack.output.publicPath and hashOptions
    // E.g. bundle.js -> /bundle.js?hash
    const entryPointPublicPaths = entryPointFiles
      .map(chunkFile => {
        const entryPointPublicPath = publicPath + chunkFile;
        return this.options.hash
          ? this.appendHash(entryPointPublicPath, compilationHash)
          : entryPointPublicPath;
      });

    entryPointPublicPaths.forEach((entryPointPublicPaths) => {
      const extMatch = extensionRegexp.exec(entryPointPublicPaths);
      // Skip if the public path is not a .css or .js file
      if (!extMatch) {
        return;
      }
      // ext will contain .js or .css
      const ext = extMatch[1];
      assets[ext].push({
        entryName: entryName,
        path: entryPointPublicPaths
      });
    });
  }
  return assets;
}

module.exports = { getSortedEntryNamesCompilation }
