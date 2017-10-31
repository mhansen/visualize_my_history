window.hv = window.hv || {};
window.hv.Throbber = Backbone.View.extend({
  initialize(options) {
    this.model = options.model;
    return this.model.bind("change:throbbing", () => this.render());
  },
  render() {
    if (this.model.get("throbbing")) {
      return $(this.el).show();
    } else {
      return $(this.el).hide();
    }
  }
});
