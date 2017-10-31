window.hv = window.hv || {};
window.hv.LoadingView= Backbone.View.extend({
  initialize(options) {
    this.model = options.model;
    return this.model.bind("change", () => this.render());
  },
  render() {
    if (this.model.get("loading")) {
      return $(this.el).show().text(this.model.get("loadingText"));
    } else {
      return $(this.el).hide();
    }
  }
});
