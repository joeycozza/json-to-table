var traverse = require('traverse');
var _        = require('lodash');

module.exports = function transformJSONToTable(docs, options) {
  options            = options || {};
  options.defaultVal = _.has(options, 'defaultVal') ? options.defaultVal : '';

  if (_.isPlainObject(docs)) {
    docs = _.flatten([docs]);
  }

  // Go through each object, find the deepest path
  // Create an array of all of the possible paths
  var headers = _.keys(traverse(docs).reduce(
    function (headers, value) {
      var self = this;
      if (this.notRoot && _.isArray(value)) {
        if (options.includeCollectionLength) {
          headers[_.tail(this.path).join('.') + '.length'] = true;
        }
        if (options.excludeSubArrays) {
          this.update(value, true);
        }
      }
      if (this.isLeaf) {
        this.path = _.map(this.path, function (level) {
          if (level.indexOf('.') > -1 && self.level > 2) { // If a leaf contains a dot in it, then surround the whole path with ticks
            level = '`' + level + '`';
          }
          return level;
        });
        if (!(_.isPlainObject(value) && _.keys(value).length === 0)) { // Check against empty objects. Don't treat these paths as a valid header value.
          headers[_.tail(this.path).join('.')] = true;
        }
      }
      return headers;
    }, {})
  );
  // Go through each object again, this time, attempt to grab the value
  // At each possible path.
  var data = [headers];
  data     = data.concat(_.map(docs, function (doc) {
    return _.map(headers, function (header) {
      if (options.checkKeyBeforePath && doc[header]) {
        return doc[header];
      }
      if (header.indexOf('`') > -1 && header.indexOf('.') > -1) { // One of those special cases where a path is nested, AND has a dot in the name.
        var parts = header.split('.`');
        var head  = parts[0].replace(/\`/g, '');
        var tail  = parts[1].replace(/\`/g, '');

        return _.get(doc, head, {})[tail];
      }
      return _.get(doc, header, options.defaultVal);
    });
  }));

  return data;
};
