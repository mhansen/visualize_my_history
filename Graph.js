window.hv = window.hv || {};
window.hv.Graph = Backbone.View.extend({
  initialize(options) {
    this.model = options.model;
    return this.model.bind("change:allVisits", () => {
      return this.render();
    });
  },
  leftPadding: 40,       // px
  topPadding: 20,        // px
  bottomPadding: 30,     // px
  width: 660,            // px
  height: 700,           // px
  render() {
    // Defer to the browser every time there's something new for it to redraw,
    // so it can update its UI to reflect the new messages and new data. This
    // stops the browser from becoming unresponsive.
    this.model.set({loadingText: 'Processing...'});
    setTimeout(() => {
      this.reticulateSplines();
      this.model.set({loadingText: 'Drawing...'});
      setTimeout(() => {
        this.renderLegend();
        this.renderSVGElement();
        this.renderXAxis();
        this.renderYAxis();
        this.renderDataDots();
        this.model.set({loadingText: 'Attaching popovers...'});
        setTimeout(() => {
          this.renderPopovers();
          $(this.el).slideDown();
          // Done! Signal that we're done loading.
          this.model.set({loading: false});
        }, 0);
      }, 0);
    }, 0);
  },

  reticulateSplines() { // Do generic ahead-of-time computations.
    this.allVisits = this.model.get("allVisits");
    this.minDay = _.min(this.allVisits, d => d.visitTime).day;
    this.maxDay = _.max(this.allVisits, d => d.visitTime).day;

    // Scales
    this.x = d3.scale.linear()
      .domain([new XDate(this.minDay).addDays(-1), this.maxDay])
      .range([0, this.width]);

    this.y = date => {
      let scaledHours = date.getHours() / 24;
      let scaledMinutes = date.getMinutes() / (24 * 60);
      let scaledSeconds = date.getSeconds() / (24 * 60 * 60);
      return (scaledHours + scaledMinutes + scaledSeconds) * this.height;
    };

    let extract_hostname = function(url) {
      let m = url.match(/^([^:]*:\/\/[^\/]*)/);
      if (m) { return m[1]; } else { return "None"; }
    };

    let m = 2; // minutes per graph point - it's clustering, essentially.

    // A primary key to cluster datapoints with. If they have the same timeKey,
    // show the datapoints inside the same visual rectangle.
    this.timeKey = function(d) {
      let mins = Math.floor(d.getMinutes()/m)*m;
      if (mins < 10) { mins = `0${mins}`; }
      return `\
${d.getHours()}:${mins}
(${d.getDate()} ${d3.time.format('%b')(d)} ${d.getFullYear()})\
`;
    };

    // Compute the legend
    this.hostnames = d3.nest()
      .key(d => extract_hostname(d.historyItem.url))
      .entries(this.allVisits);
    this.hostnames.sort((a, b) => b.values.length - a.values.length);

    this.colors = {};
    // I think these colors are easy to tell apart from each other on a
    // scatterplot. Unlike, say, orange vs brown, or purple vs violet.
    let distinguishable_colors = [
      "blue", "green", "orange",
      "magenta", "red", "purple"
    ];
    this.num_legend_items = Math.min(this.hostnames.length, 100);
    for (let i of Array.from(_.range(this.num_legend_items))) {
      this.colors[this.hostnames[i].key] = distinguishable_colors[i] || "gray";
    }

    return this.colorfn = d => {
      // There could be a lot of hostnames inside one data point, because
      // we're clustering them together. We still need to decide on one
      // color for the datapoint. We arbitrarily go with the color of the
      // hostname of the first URL in the datapoint.
      let hostname = extract_hostname(d.values[0].historyItem.url);
      return this.colors[hostname];
    };
  },

  renderLegend() {
    let most_visited_hostname = this.hostnames[0];
    let barsize = d3.scale.linear()
      .domain([0, most_visited_hostname.values.length])
      .range([0, 130]);

    // Draw the legend
    return d3.select("#legend")
      .selectAll("li")
      .data(_(this.hostnames).first(this.num_legend_items))
      .enter()
      .append("li")
      .html(d => {
        return `\
<a href='${_.escape(d.key)}'>${_.escape(d.key)}</a>
<span class='bar'
      style='width: ${barsize(d.values.length)}px;
              background-color: ${this.colors[d.key]};'>
</span>
<span class='count'>x${d.values.length}</span>\
`;
      });
  },

  renderSVGElement() {
    $(this.el).children().remove();
    return d3.select(this.el)
      .attr("viewBox", `${-this.leftPadding} ${-this.topPadding} ` +
                       ` ${this.width} ${this.height + this.bottomPadding}`)
      .attr("preserveAspectRatio", "none")
      .attr("width", this.leftPadding + this.width)
      .attr("height", this.topPadding + this.height + this.bottomPadding);
  },

  renderXAxis() {
    // Draw the X axis
    let xaxisGroup = d3.select(this.el)
      .append("g")
      .attr("class", "xaxis");

    xaxisGroup.append("svg:line")
      .attr("x1", 0)
      .attr("x2", this.width)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", 1);

    let xaxisData = xaxisGroup.selectAll("text")
      .data(d3.time.months(this.minDay, this.maxDay))
      .enter();

    xaxisData.append("text")
      .attr("y", 0)
      .attr("dominant-baseline", "end")
      .attr("text-anchor", "start")
      .attr("dy", -8)
      .attr("dx", +8)
      .attr("x", this.x)
      .text(d3.time.format("%B"));

    return xaxisData.append("line")
      .attr("y1", -20)
      .attr("y2", 0)
      .attr("x1", this.x)
      .attr("x2", this.x)
      .attr("stroke", 1)
      .attr("fill", "black");
  },

  renderYAxis() {
    // Draw the Y axis
    let yaxisGroup = d3.select(this.el)
      .append("g")
      .attr("class", "yaxis");

    yaxisGroup.append("svg:line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", this.height)
      .attr("stroke", 1);

    let yaxisData = yaxisGroup.selectAll("text")
      .data([0, 3, 6, 9, 12, 15, 18, 21, 24])
      .enter();

    yaxisData.append("text")
      .attr("x", 0)
      .attr("dominant-baseline", "central")
      .attr("text-anchor", "end")
      .attr("dx", -5)
      .attr("y", d => this.height * (d/24))
      .text(function(d) {
        if (d < 12) {
          return d + "am";
        } else if (d > 13) {
          return (d - 12) + "pm";
        } else {
          return d + "pm";
        }});

    return yaxisData.append("line")
      .attr("x1", -5)
      .attr("x2", 0)
      .attr("y1", d => this.height * (d / 24))
      .attr("y2", d => this.height * (d / 24))
      .attr("stroke", 1)
      .attr("fill", "black");
  },

  renderDataDots() {
    // Draw the data scatterplot dots
    let entriesGroup = d3.select(this.el)
      .append("g")
      .attr("class", "entries");

    console.time("nesting");
    console.profile("nesting");
    let nestedData = d3.nest()
      .key(d => d.day)
      .key(d => this.timeKey(d.date))
      .entries(this.allVisits);
    console.timeEnd("nesting");
    console.profileEnd("nesting");
    
    let dayGroups = entriesGroup.selectAll("g")
      .data(nestedData)
      .enter()
      .append("svg:g");

    dayGroups.selectAll("rect")
      .data(d => d.values)
      .enter()
      .append("svg:rect")
      .attr("class", "entry")
      .attr("x", d => this.x(d.values[0].day) - 2.5)
      .attr("y", d => this.y(d.values[0].date) - 0.5)
      .attr("width", 5)
      .attr("height", 2)
      .attr("fill", this.colorfn);
    return console.timeEnd("drawing");
  },

  renderPopovers() {
    // Hook up the mouse hover popovers
    console.time("popover");
    this.$("rect.entry").popover({
      title() { return this.__data__.key; },
      content() {
        return "<ul>" +
          this.__data__.values.map(d =>
            `\
<li>${_.escape(d.historyItem.title || d.historyItem.url)}</li>\
`
        ).join("") +
        "</ul>";
      },
      html: true,
      placement: "right",
      placement(tip, element) {
        let offset = $(element).offset();
        let height = $(document).outerHeight();
        let width = $(document).outerWidth();
        let vert = (0.5 * height) - offset.top;
        let vertPlacement = vert > 0 ? 'bottom' : 'top';
        let horiz = (0.5 * width) - offset.left;
        let horizPlacement = horiz > 0 ? 'right' : 'left';
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
