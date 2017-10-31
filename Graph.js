
window.hv = window.hv || {};

window.hv.Graph = Backbone.View.extend({
  initialize: function(options) {
    var _this = this;
    this.model = options.model;
    return this.model.bind("change:allVisits", function() {
      return _this.render();
    });
  },
  leftPadding: 40,
  topPadding: 20,
  bottomPadding: 30,
  width: 660,
  height: 700,
  render: function() {
    var _this = this;
    this.model.set({
      loadingText: 'Processing...'
    });
    return _.defer(function() {
      _this.reticulateSplines();
      _this.model.set({
        loadingText: 'Drawing...'
      });
      return _.defer(function() {
        _this.renderLegend();
        _this.renderSVGElement();
        _this.renderXAxis();
        _this.renderYAxis();
        _this.renderDataDots();
        _this.model.set({
          loadingText: 'Attaching popovers...'
        });
        return _.defer(function() {
          _this.renderPopovers();
          $(_this.el).slideDown();
          return _this.model.set({
            loading: false
          });
        });
      });
    });
  },
  reticulateSplines: function() {
    var distinguishable_colors, extract_hostname, i, m, _i, _len, _ref,
      _this = this;
    this.allVisits = this.model.get("allVisits");
    this.minDay = _.min(this.allVisits, function(d) {
      return d.visitTime;
    }).day;
    this.maxDay = _.max(this.allVisits, function(d) {
      return d.visitTime;
    }).day;
    this.x = d3.scale.linear().domain([new XDate(this.minDay).addDays(-1), this.maxDay]).range([0, this.width]);
    this.y = function(date) {
      var scaledHours, scaledMinutes, scaledSeconds;
      scaledHours = date.getHours() / 24;
      scaledMinutes = date.getMinutes() / (24 * 60);
      scaledSeconds = date.getSeconds() / (24 * 60 * 60);
      return (scaledHours + scaledMinutes + scaledSeconds) * _this.height;
    };
    extract_hostname = function(url) {
      var m;
      m = url.match(/^([^:]*:\/\/[^\/]*)/);
      if (m) {
        return m[1];
      } else {
        return "None";
      }
    };
    m = 2;
    this.timeKey = function(d) {
      var mins;
      mins = Math.floor(d.getMinutes() / m) * m;
      if (mins < 10) mins = "0" + mins;
      return "" + (d.getHours()) + ":" + mins + "\n(" + (d.getDate()) + " " + (d3.time.format('%b')(d)) + " " + (d.getFullYear()) + ")";
    };
    this.hostnames = d3.nest().key(function(d) {
      return extract_hostname(d.historyItem.url);
    }).entries(this.allVisits);
    this.hostnames.sort(function(a, b) {
      return b.values.length - a.values.length;
    });
    this.colors = {};
    distinguishable_colors = ["blue", "green", "orange", "magenta", "red", "purple"];
    this.num_legend_items = Math.min(this.hostnames.length, 100);
    _ref = _.range(this.num_legend_items);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      i = _ref[_i];
      this.colors[this.hostnames[i].key] = distinguishable_colors[i] || "gray";
    }
    return this.colorfn = function(d) {
      var hostname;
      hostname = extract_hostname(d.values[0].historyItem.url);
      return _this.colors[hostname];
    };
  },
  renderLegend: function() {
    var barsize, most_visited_hostname,
      _this = this;
    most_visited_hostname = this.hostnames[0];
    barsize = d3.scale.linear().domain([0, most_visited_hostname.values.length]).range([0, 130]);
    return d3.select("#legend").selectAll("li").data(_(this.hostnames).first(this.num_legend_items)).enter().append("li").html(function(d) {
      return "<a href='" + (_.escape(d.key)) + "'>" + (_.escape(d.key)) + "</a>\n<span class='bar'\n      style='width: " + (barsize(d.values.length)) + "px;\n              background-color: " + _this.colors[d.key] + ";'>\n</span>\n<span class='count'>x" + d.values.length + "</span>";
    });
  },
  renderSVGElement: function() {
    $(this.el).children().remove();
    return d3.select(this.el).attr("viewBox", ("" + (-this.leftPadding) + " " + (-this.topPadding) + " ") + (" " + this.width + " " + (this.height + this.bottomPadding))).attr("preserveAspectRatio", "none").attr("width", this.leftPadding + this.width).attr("height", this.topPadding + this.height + this.bottomPadding);
  },
  renderXAxis: function() {
    var xaxisData, xaxisGroup;
    xaxisGroup = d3.select(this.el).append("g").attr("class", "xaxis");
    xaxisGroup.append("svg:line").attr("x1", 0).attr("x2", this.width).attr("y1", 0).attr("y2", 0).attr("stroke", 1);
    xaxisData = xaxisGroup.selectAll("text").data(d3.time.months(this.minDay, this.maxDay)).enter();
    xaxisData.append("text").attr("y", 0).attr("dominant-baseline", "end").attr("text-anchor", "start").attr("dy", -8).attr("dx", +8).attr("x", this.x).text(d3.time.format("%B"));
    return xaxisData.append("line").attr("y1", -20).attr("y2", 0).attr("x1", this.x).attr("x2", this.x).attr("stroke", 1).attr("fill", "black");
  },
  renderYAxis: function() {
    var yaxisData, yaxisGroup,
      _this = this;
    yaxisGroup = d3.select(this.el).append("g").attr("class", "yaxis");
    yaxisGroup.append("svg:line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", this.height).attr("stroke", 1);
    yaxisData = yaxisGroup.selectAll("text").data([0, 3, 6, 9, 12, 15, 18, 21, 24]).enter();
    yaxisData.append("text").attr("x", 0).attr("dominant-baseline", "central").attr("text-anchor", "end").attr("dx", -5).attr("y", function(d) {
      return _this.height * (d / 24);
    }).text(function(d) {
      if (d < 12) {
        return d + "am";
      } else if (d > 13) {
        return (d - 12) + "pm";
      } else {
        return d + "pm";
      }
    });
    return yaxisData.append("line").attr("x1", -5).attr("x2", 0).attr("y1", function(d) {
      return _this.height * (d / 24);
    }).attr("y2", function(d) {
      return _this.height * (d / 24);
    }).attr("stroke", 1).attr("fill", "black");
  },
  renderDataDots: function() {
    var dayGroups, entriesGroup, nestedData,
      _this = this;
    entriesGroup = d3.select(this.el).append("g").attr("class", "entries");
    console.time("nesting");
    console.profile("nesting");
    nestedData = d3.nest().key(function(d) {
      return d.day;
    }).key(function(d) {
      return _this.timeKey(d.date);
    }).entries(this.allVisits);
    console.timeEnd("nesting");
    console.profileEnd("nesting");
    dayGroups = entriesGroup.selectAll("g").data(nestedData).enter().append("svg:g");
    dayGroups.selectAll("rect").data(function(d) {
      return d.values;
    }).enter().append("svg:rect").attr("class", "entry").attr("x", function(d) {
      return _this.x(d.values[0].day) - 2.5;
    }).attr("y", function(d) {
      return _this.y(d.values[0].date) - 0.5;
    }).attr("width", 5).attr("height", 2).attr("fill", this.colorfn);
    return console.timeEnd("drawing");
  },
  renderPopovers: function() {
    console.time("popover");
    this.$("rect.entry").popover({
      title: function() {
        return this.__data__.key;
      },
      content: function() {
        return "<ul>" + this.__data__.values.map(function(d) {
          return "<li>" + (_.escape(d.historyItem.title || d.historyItem.url)) + "</li>";
        }).join("") + "</ul>";
      },
      html: true,
      placement: "right",
      placement: function(tip, element) {
        var height, horiz, horizPlacement, offset, vert, vertPlacement, width;
        offset = $(element).offset();
        height = $(document).outerHeight();
        width = $(document).outerWidth();
        vert = 0.5 * height - offset.top;
        vertPlacement = vert > 0 ? 'bottom' : 'top';
        horiz = 0.5 * width - offset.left;
        horizPlacement = horiz > 0 ? 'right' : 'left';
        if (Math.abs(horiz) > Math.abs(vert)) {
          return horizPlacement;
        } else {
          return vertPlacement;
        }
      },
      offset: 2
    });
    return console.timeEnd("popover");
  }
});
