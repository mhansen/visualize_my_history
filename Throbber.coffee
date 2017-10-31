window.hv = window.hv || {}
window.hv.Throbber = Backbone.View.extend
  initialize: (options) ->
    @model = options.model
    @model.bind "change:throbbing", => @render()
  render: ->
    if @model.get "throbbing"
      $(@el).show()
    else
      $(@el).hide()
