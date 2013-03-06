var	Factory
=	function()
	{
		return	{
					profiles:
					{
						partial :
						{
							embedded:
							{
								type: "partial"
							}
						,	linked:
							{
								type: "partial"
							}
						,	collection: 
							{
								type: "list"
							}
						}
					,	single :
						{
							embedded:
							{
								type: "single"
							}
						,	linked:
							{
								type: "single"
							}
						,	collection: 
							{
								type: "list"
							}
						}
					,	none :
						{
							embedded:
							{
								type: "none"
							}
						,	linked:
							{
								type: "none"
							}
						,	collection: 
							{
								type: "list"
							}
						}
					}
				,	list:
					{
						type: 'list'
					}
				,	assoc_type:
					{
						'has-many':
							{
								required: ['target', 'target_key']
							,	optional: ['key']
							}
						,	'has-one':
							{
								required: ['target', 'target_key']
							,	optional: ['key']
							}
						,	'belongs-to':
							{
								required: ['target', 'key']
							,	optional: ['target_key']
							}
						,	'has-many:through':
							{
								required: [ 'through', 'target']
							,	optional: ['key','target_key']
							}
						,	'has-one:through':
							{
								required: ['through', 'target']
							,	optional: ['key','target_key']
							}
						,	'is-a':
							{
								required:['target','key']
							,	optional:['target_key']
							}
					}
				,	assoc_values:
					{
						'has-many':{
							key: 'id'
						}
					,	'has-one':{
							key:'id'
						}
					,	'belongs-to':{
							target_key:'id'
						}
					,	'has-many:through':{
							key:'id'
						,	target_key:'id'
						}
					,	'has-one:through':{
							key:'id'
						,	target_key: 'id' 
						}
					,	'is-a':{
							target_key:'id'
						}
					}
				}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.ConfigFactory
	=	Factory
else
	module.exports
	=	Factory