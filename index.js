
/**
 * Module dependencies.
 */

var request = require('superagent');
var debug = require('debug')('tpb');
var jquery = require('cheerio').load;

/**
 * Expose `Search`.
 */

exports = module.exports = Search;

/**
 * TPB endpoint.  May be overwritten.
 */

exports.ENDPOINT = 'http://thepiratebay.org';

/**
 * Create a new `Search` with the given `terms`.
 *
 * @api public
 * @param {String} terms...
 */

function Search(terms) {
  var terms = Array.isArray(terms)
    ? terms
    : [].slice.call(arguments);
  if (!(this instanceof Search)) {
    return new Search(terms);
  }

  debug('search terms: "%s"', terms.join('", "'));
  this._terms = terms;
  this.page(0);
  this.filter('seeders');
  this.category('video');
}

Search.prototype.query = function (fn) {
  var terms = this._terms.join(' ');
  var api = '/search/'
    + encodeURIComponent(terms)
    + '/' + this.page()
    + '/' + this.filter()
    + '/' + this.category();
  debug('request %s', api);
  request
  .get(exports.ENDPOINT + api)
  .end(function (err, res) {
    if (err) return fn(err);
    if (!res.ok) {
      var err = new Error(ENDPOINT + ' responded with a ' + res.status);
      return fn(err);
    }

    try {
      fn(null, parse(res.text));
    } catch (err) {
      fn(err);
    }
  });
};

/**
 * Get/set the search page.
 *
 * @api public
 * @param {Number} page
 * @return {Number|Search}
 */

Search.prototype.page = function (page) {
  if (0 == arguments.length) return this._page;
  debug('set search page: %s', page);
  this._page = page;
  return this;
};

/**
 * Get/set the search filter.
 *
 * @api public
 * @param {String|Number} filter
 * @return {Number|Search}
 */

Search.prototype.filter = function (filter) {
  if (0 == arguments.length) return this._filter;
  debug('set search filter: %s', filter);
  if ('number' == typeof filter) {
    this._filter = filter;
  } else {
    this._filter = filters[filter];
  }
  return this;
};

/**
 * Get/set the search category.
 *
 * @api public
 * @param {String|Number} category
 * @return {Number|Search}
 */

Search.prototype.category = function (category) {
  if (0 == arguments.length) return this._category;
  debug('set search category: %s', category);
  if ('number' == typeof category) {
    this._category = category;
  } else {
    this._category = categories[category];
  }
  return this;
};

/**
 * Parse the given `html` for torrents.
 *
 * @api private
 * @param {String} html
 * @return {Array} torrents
 */

function parse(html) {
  var torrents = [];
  var $ = jquery(html);
  var $rows = $('#searchResult tr:not([class*="header"])');
  debug('found %d torrent rows', $rows.length);
  $rows.each(function () {
    var $row = $(this);
    var $cells = $row.find('td');
    var $category = $cells.eq(0);
    var $data = $cells.eq(1);
    var $link = $data.find('.detLink');
    var $desc = $data.find('.detDesc');
    var meta = parseMeta($desc.text());

    var title = $link.text();
    debug('parsing %s', title);
    var $seeders = $cells.eq(2);
    var $leechers = $cells.eq(3);

    var torrent = {};
    torrent.title = title;
    torrent.url = $link.attr('href');
    torrent.date = meta.date;
    torrent.size = meta.size;
    torrent.category = $category.text().trim().replace(/\s+/g, ' ');
    torrent.seeders = +$seeders.text().trim();
    torrent.leechers = +$leechers.text().trim();
    torrents.push(torrent);
  });

  return torrents;
}

/**
 * Parse the meta `text` associated with a torrent.
 *
 * @api private
 * @param {String} text
 * @return {Object}
 */

function parseMeta(text) {
  // Uploaded 06-23 21:47, Size 421.38 MiB, ULed by
  // Uploaded 01-22 2013, Size 546.24 MiB, ULed by sceneline
  var parts = text.split(',');
  var uploaded = parts[0];
  var size = parts[1];
  return {
    date: parseTimestamp(uploaded.split(' ').pop()),
    size: size && size.trim().split(' ').pop(),
  };
}

/**
 * Parse the poorly formatted `date` string into a `Date`.
 *
 * @api private
 * @param {String} date
 * @return {Date}
 */

function parseTimestamp(date) {
  var month = date.substring(0, 2);
  var day = date.substring(3, 5);
  var year = ~date.indexOf(':')
    ? new Date().getFullYear()
    : date.substr(-4);
  return new Date([month, day, year].join('/'));
}

/**
 * Sorting filters.
 */

var filters = {
  relevance: 99,
  type: 13,
  name: 1,
  date: 3,
  size: 5,
  uploader: 11,
  seeders: 7,
  leechers: 9,
};

/**
 * Search categories.
 */

var categories = {
  audio: 100,
  video: 200,
  applications: 300,
  games: 400,
  porn: 500,
  other: 600,
};
