window.hv = window.hv || {};
window.hv.LoadingView= Backbone.View.extend({
  initialize(options) {
    this.model = options.model;
    this.model.bind("change", () => this.render());
  },
  render() {
    if (this.model.get("loading")) {
      this.el.style.display = 'block';
      this.el.textContent = this.model.get("loadingText");
    } else {
      this.el.style.display = 'none';
    }
  }
});
