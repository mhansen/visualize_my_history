window.hv = window.hv || {}
window.hv.LoadingView= Backbone.View.extend
  initialize: (options) ->
    @model = options.model
    @model.bind "change", => @render()
  render: ->
    if @model.get "loading"
      $(@el).show().text(@model.get("loadingText"))
    else
      $(@el).hide()
