Component({
  properties: { value: { type: Number, value: 0 }, label: { type: String, value: '' } },
  data: { displayValue: 0 },
  lifetimes: { attached() { setTimeout(() => this.setData({ displayValue: this.properties.value }), 180) } }
})
