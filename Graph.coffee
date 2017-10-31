window.hv = window.hv || {}
window.hv.Graph = Backbone.View.extend
  initialize: (options) ->
    @model = options.model
    @model.bind "change:allVisits", =>
      @render()
  leftPadding: 40       # px
  topPadding: 20        # px
  bottomPadding: 30     # px
  width: 660            # px
  height: 700           # px
  render: ->
    # Defer to the browser every time there's something new for it to redraw,
    # so it can update its UI to reflect the new messages and new data. This
    # stops the browser from becoming unresponsive.
    @model.set loadingText: 'Processing...'
    _.defer =>
      @reticulateSplines()
      @model.set loadingText: 'Drawing...'
      _.defer =>
        @renderLegend()
        @renderSVGElement()
        @renderXAxis()
        @renderYAxis()
        @renderDataDots()
        @model.set loadingText: 'Attaching popovers...'
        _.defer =>
          @renderPopovers()
          $(@el).slideDown()
          # Done! Signal that we're done loading.
          @model.set loading: false

  reticulateSplines: -> # Do generic ahead-of-time computations.
    @allVisits = @model.get "allVisits"
    @minDay = _.min(@allVisits, (d) -> d.visitTime).day
    @maxDay = _.max(@allVisits, (d) -> d.visitTime).day

    # Scales
    @x = d3.scale.linear()
      .domain([new XDate(@minDay).addDays(-1), @maxDay])
      .range([0, @width])

    @y = (date) =>
      scaledHours = date.getHours() / 24
      scaledMinutes = date.getMinutes() / (24 * 60)
      scaledSeconds = date.getSeconds() / (24 * 60 * 60)
      (scaledHours + scaledMinutes + scaledSeconds) * @height

    extract_hostname = (url) ->
      m = url.match(/^([^:]*:\/\/[^\/]*)/)
      if m then m[1] else "None"

    m = 2 # minutes per graph point - it's clustering, essentially.

    # A primary key to cluster datapoints with. If they have the same timeKey,
    # show the datapoints inside the same visual rectangle.
    @timeKey = (d) ->
      mins = Math.floor(d.getMinutes()/m)*m
      mins = "0" + mins if mins < 10
      """
      #{d.getHours()}:#{mins}
      (#{d.getDate()} #{d3.time.format('%b')(d)} #{d.getFullYear()})
      """

    # Compute the legend
    @hostnames = d3.nest()
      .key((d) -> extract_hostname(d.historyItem.url))
      .entries(@allVisits)
    @hostnames.sort((a, b) -> b.values.length - a.values.length)

    @colors = {}
    # I think these colors are easy to tell apart from each other on a
    # scatterplot. Unlike, say, orange vs brown, or purple vs violet.
    distinguishable_colors = [
      "blue", "green", "orange",
      "magenta", "red", "purple"
    ]
    @num_legend_items = Math.min(@hostnames.length, 100)
    for i in _.range(@num_legend_items)
      @colors[@hostnames[i].key] = distinguishable_colors[i] or "gray"

    @colorfn = (d) =>
      # There could be a lot of hostnames inside one data point, because
      # we're clustering them together. We still need to decide on one
      # color for the datapoint. We arbitrarily go with the color of the
      # hostname of the first URL in the datapoint.
      hostname = extract_hostname(d.values[0].historyItem.url)
      @colors[hostname]

  renderLegend: ->
    most_visited_hostname = @hostnames[0]
    barsize = d3.scale.linear()
      .domain([0, most_visited_hostname.values.length])
      .range([0, 130])

    # Draw the legend
    d3.select("#legend")
      .selectAll("li")
      .data(_(@hostnames).first(@num_legend_items))
      .enter()
      .append("li")
      .html((d) =>
        """
        <a href='#{_.escape d.key}'>#{_.escape d.key}</a>
        <span class='bar'
              style='width: #{barsize(d.values.length)}px;
                      background-color: #{@colors[d.key]};'>
        </span>
        <span class='count'>x#{d.values.length}</span>
        """
      )

  renderSVGElement: ->
    $(@el).children().remove()
    d3.select(@el)
      .attr("viewBox", "#{-@leftPadding} #{-@topPadding} " +
                       " #{@width} #{@height + @bottomPadding}")
      .attr("preserveAspectRatio", "none")
      .attr("width", @leftPadding + @width)
      .attr("height", @topPadding + @height + @bottomPadding)

  renderXAxis: ->
    # Draw the X axis
    xaxisGroup = d3.select(@el)
      .append("g")
      .attr("class", "xaxis")

    xaxisGroup.append("svg:line")
      .attr("x1", 0)
      .attr("x2", @width)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", 1)

    xaxisData = xaxisGroup.selectAll("text")
      .data(d3.time.months(@minDay, @maxDay))
      .enter()

    xaxisData.append("text")
      .attr("y", 0)
      .attr("dominant-baseline", "end")
      .attr("text-anchor", "start")
      .attr("dy", -8)
      .attr("dx", +8)
      .attr("x", @x)
      .text(d3.time.format("%B"))

    xaxisData.append("line")
      .attr("y1", -20)
      .attr("y2", 0)
      .attr("x1", @x)
      .attr("x2", @x)
      .attr("stroke", 1)
      .attr("fill", "black")

  renderYAxis: ->
    # Draw the Y axis
    yaxisGroup = d3.select(@el)
      .append("g")
      .attr("class", "yaxis")

    yaxisGroup.append("svg:line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", @height)
      .attr("stroke", 1)

    yaxisData = yaxisGroup.selectAll("text")
      .data([0, 3, 6, 9, 12, 15, 18, 21, 24])
      .enter()

    yaxisData.append("text")
      .attr("x", 0)
      .attr("dominant-baseline", "central")
      .attr("text-anchor", "end")
      .attr("dx", -5)
      .attr("y", (d) => @height * (d/24))
      .text((d) ->
        if d < 12
          d + "am"
        else if d > 13
          (d - 12) + "pm"
        else
          d + "pm")

    yaxisData.append("line")
      .attr("x1", -5)
      .attr("x2", 0)
      .attr("y1", (d) => @height * (d / 24))
      .attr("y2", (d) => @height * (d / 24))
      .attr("stroke", 1)
      .attr("fill", "black")

  renderDataDots: ->
    # Draw the data scatterplot dots
    entriesGroup = d3.select(@el)
      .append("g")
      .attr("class", "entries")

    console.time "nesting"
    console.profile "nesting"
    nestedData = d3.nest()
      .key((d) -> d.day)
      .key((d) => @timeKey(d.date))
      .entries(@allVisits)
    console.timeEnd "nesting"
    console.profileEnd "nesting"
    
    dayGroups = entriesGroup.selectAll("g")
      .data(nestedData)
      .enter()
      .append("svg:g")

    dayGroups.selectAll("rect")
      .data((d) -> d.values)
      .enter()
      .append("svg:rect")
      .attr("class", "entry")
      .attr("x", (d) => @x(d.values[0].day) - 2.5)
      .attr("y", (d) => @y(d.values[0].date) - 0.5)
      .attr("width", 5)
      .attr("height", 2)
      .attr("fill", @colorfn)
    console.timeEnd "drawing"

  renderPopovers: ->
    # Hook up the mouse hover popovers
    console.time "popover"
    @$("rect.entry").popover
      title: -> @__data__.key
      content: ->
        "<ul>" +
          @__data__.values.map((d) ->
            """
            <li>#{_.escape(d.historyItem.title || d.historyItem.url)}</li>
            """
        ).join("") +
        "</ul>"
      html: true
      placement: "right"
      placement: (tip, element) ->
        offset = $(element).offset()
        height = $(document).outerHeight()
        width = $(document).outerWidth()
        vert = 0.5 * height - offset.top
        vertPlacement = if vert > 0 then 'bottom' else 'top'
        horiz = 0.5 * width - offset.left
        horizPlacement = if horiz > 0 then 'right' else 'left'
        if Math.abs(horiz) > Math.abs(vert)
          horizPlacement
        else
          vertPlacement
      offset: 2
    console.timeEnd "popover"
