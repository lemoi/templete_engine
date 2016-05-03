module.exports=function render_func(str,context){
  var result=[]
  var c_a,c_i,c_items
  c_a=context.a
  c_items=context.items
  push=result.push.bind(result);
  push("<div>\n	")
  if(c_a>20){
    push("\n		adult\n	")
  }
  push("\n	")
  for(c_i in c_items){
    push("\n		<span>",str(c_i)," : ",str(c_items[c_i]),"</span>\n	")
  }
  push("\n</div>")
  return result.join("")
}
