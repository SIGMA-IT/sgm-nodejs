var	Factory
=	function(_)
	{
		_.mixin({
		  // ### _.objMap
		  // _.map for objects, keeps key/value associations
		  objMap: function (input, mapper, context) {
			return _.reduce(input, function (obj, v, k) {
					 obj[k] = mapper.call(context, v, k, input);
					 return obj;
				   }, {}, context);
		  },
		  // ### _.objFilter
		  // _.filter for objects, keeps key/value associations
		  // but only includes the properties that pass test().
		  objFilter: function (input, test, context) {
			return _.reduce(input, function (obj, v, k) {
					 if (test.call(context, v, k, input)) {
					   obj[k] = v;
					 }
					 return obj;
				   }, {}, context);
		  },
		  // ### _.objReject
		  //
		  // _.reject for objects, keeps key/value associations
		  // but does not include the properties that pass test().
		  objReject: function (input, test, context) {
			return _.reduce(input, function (obj, v, k) {
					 if (!test.call(context, v, k, input)) {
					   obj[k] = v;
					 }
					 return obj;
				   }, {}, context);
		  },

		  // ### _.stringParser
		  //
		  // stringParser parse a string
		  stringParser: function(string){
		  	_.each(
				[
					{ex: /\s/g, value:"_"}
				,	{ex: /[àáâãäå]/g,value:"a"}
				,	{ex: /[èéêë]/g, value:"e"}
				,	{ex: /[ìíîï]/g, value:"i"}
				,	{ex: /ñ/g, value:"n"}
				,	{ex: /[òóôõö]/g, value:"o"}
				,	{ex: /[ùúûü]/g, value:"u"}
				,	{ex: /[ýÿ]/g,value:"y"}
				,	{ex: /[^a-zA-Z 0-9.]+/g, value:""}
				]
			,	function(reg)
				{
					string
					=	string.replace(reg.ex,reg.value)
				}
			)
			return	string.toLowerCase()
		  }
		});
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.OverscoreFactory
	=	Factory
else
	module.exports
	=	Factory
