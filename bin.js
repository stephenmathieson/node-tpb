#!/usr/bin/env node

var Search = require('./');
var assert = require('assert');
var program = require('commander');
var Table = require('cli-table');

process.title = program._name = 'tpb';

program
  .version(require('./package.json').version)
  .usage('[options] <terms ...>')
  .description('search The Pirate Bay for torrents')
  .option('-c, --category [category]', 'search category [video]', 'video')
  .option('-f, --filter [filter]', 'search filter [seeders]', 'seeders')
  .parse(process.argv);

if (!program.args.length) return program.help();

var search = new Search(program.args);
search.category(program.category);
search.filter(program.filter);
search.query(function (err, torrents) {
  if (err) throw err;

  var width = process.stdout.getWindowSize()[0] / 11;
  var table = new Table({
    head: [
      'Title',
      'URL',
      'Seeders',
      'Leechers',
    ],
    colWidths: [
      Math.round(width * 3),
      Math.round(width * 5),
      Math.round(width),
      Math.round(width),
    ]
  });

  for (var i = 0, l = torrents.length; i < l; i++) {
    table.push([
      torrents[i].title,
      Search.ENDPOINT + torrents[i].url,
      torrents[i].seeders,
      torrents[i].leechers,
    ]);
  }

  console.log(table.toString());
});

