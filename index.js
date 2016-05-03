
'use strict';
/*
require nodejs ^6.0.0
*/
const fs=require('fs');
class Code{
	constructor(indent=0){
		this.indent_level=indent;
		this.code=[];
	}
	addline(line){
		this.code.push(' '.repeat(this.indent_level)+line+Code.SIGN_CHANGE_LINE);
	}
	addsection(){
		var section=new Code(this.indent_level);
		this.code.push(section);
		return section;
	}
	indent(){
		this.indent_level+=Code.INDNET_STEP;
	}
	dedent(){
		this.indent_level-=Code.INDNET_STEP;
	}
	toString(){
		var result=""; 
		for(const i of this.code){
			result+=i.toString();
		}
		return result;
	}
}
Code.INDNET_STEP=2;
Code.SIGN_CHANGE_LINE='\n';
class Templete{
	constructor(text){
		var code,vars_code,buffer,tokens,scope;
	  code=new Code();
		this.all_vars=new Set();
		this.loop_vars=new Set();
		code.addline('module.exports=function render_func(str,context){');
		code.indent();
		code.addline('var result=[]');
		vars_code=code.addsection();
		code.addline('push=result.push.bind(result);');
		buffer=[];
		function repr(i){
			return "\""+i.replace(/\r\n/g,'\\n').replace(/(['"])/g,"\\$1")+"\"";
		}
		function flush_buffer(){
			code.addline(`push(${buffer})`);
			buffer.splice(0);
		}
		tokens=text.split(/({{.*?}}|{%.*?%}|{#.*?#})/);
		scope=[];
		for(let token of tokens){
			//console.log(token)
			if(token.startsWith('{#')){
				continue;
			}else if(token.startsWith('{{')){
				let expr=token.slice(2,-2).trim();
				this._variable(expr);
				buffer.push(`str(${this._expr(expr)})`);
			}else if(token.startsWith('{%')){
				flush_buffer();
				let words=token.slice(2,-2).trim().split(' ');
				if(words[0]==='if'){
					this._variable(words[1]);
					code.addline(`if(c_${words[1]}){`);
					code.indent();
					scope.push('if');					
				}else if(words[0]==='for'){
					this._variable(words[1]);
					this._variable(words[3]);
					this.loop_vars.add(words[1]);
					code.addline(`for(c_${words[1]} in c_${words[3]}){`);
					scope.push('for');
					code.indent();
				}else if(words[0]==='elseif'){
					this._variable(words[1]);
					code.dedent();
					code.addline(`}else if(c_${words[1]}){`);
					code.indent();
				}else if(words[0]==='else'){
					code.dedent();
					code.addline('}else{');
				}else if(words[0].startsWith('end')){
					let sign=words[0].slice(3),which;
					if(scope.length===0) this._error("Too many ends: ",token);
					which=scope.pop();
					if(sign!==which) this._error("Can't match end",token);
					code.dedent();
					code.addline('}');
				}
			}else{
				if(token){
					buffer.push(repr(token));
				}
			}
		}
		flush_buffer();
		if(scope.length!==0) this._error("less end");
		let vars,cvars;
		[...vars]=this.all_vars.values();
		cvars=vars.filter(i=>!this.loop_vars.has(i));
		vars_code.addline(`var ${vars.map(i=>'c_'+i)}`);
		cvars.forEach(i=>{
			vars_code.addline(`c_${i}=context.${i}`);
		});
		code.addline('return result.join("")');
		code.dedent();
		code.addline('}');
		this.code=code;
	}
	_variable(expr){
		var _var=expr.match(/^[_A-Za-z][_A-Za-z0-9]*/);
		if(_var){
			this.all_vars.add(_var[0]);
		}else{
			this._error('invaild variable',expr);
		}
	}
	_error(error_info,token){
		throw new Error(error_info+':>'+token);
	}
	toString(){
		return this.code.toString();
	}
	_expr(expr){
		if(expr.indexOf('.')!=-1){
			let sp=expr.split('.');
			return sp.map((i,index)=>{
				if(index===0) return `c_${i}`;
				if(this.all_vars.has(i)) return `[c_${i}]`;
				return `["${i}"]`;
			}).join("");
		}else if(this.all_vars.has(expr)){
			return `c_${expr}`;
		}
		return "\""+expr+"\"";
	}
}
function str(obj){
	return obj.toString();
}
exports.getRender=function(filename,path="./templetes"){
	try{
		fs.accessSync(path+'/__cache__');
	}catch(err){
		fs.mkdirSync(path+'/__cache__');
	}
	try{
		let file=fs.readFileSync(path+'/'+filename,'utf8');
		let tp=new Templete(file);
		let name=path+'/__cache__/'+filename.replace(/\..*/,'.js');
		fs.writeFileSync(name,tp.toString());
		return require(name).bind(null,str);
	}catch(err){
		throw new Error('render failed');
	}
};