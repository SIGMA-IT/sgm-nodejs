var	Factory
=	function(_)
	{
	return	function(sources_list,loader)
		{
			this.sources
			=	_(sources_list).objMap(loader)
			this.filter
			=	function(what,filter,callback)
				{
				var	self
				=	this
					callback(
						filter.through
							?_(
								_(self.sources[filter.through.name])
								.filter(
									function(item)
									{
									return	item[filter.through.key]==filter.through.id
									}
								)
							).map(
								function(item_th)
								{
								return	_(self.sources[what])
								.find(
									function(item)
									{
									return	item[filter.key]==item_th[filter.through.target_key]
									}
								)
								}
							)
							:(filter.key&&filter.id)
								?_(self.sources[what])
								.filter(
									function(item)
									{
									return	item[filter.key]==filter.id
									}
								)
								:((!filter.key)&&(!filter.id))
									?self.sources[what]
									:[]
					)
				}
			this.find
			=	function(what,filter,callback)
				{
					callback(
						_(this.sources[what])
						.find(
							function(item)
							{
							return	item[filter.key]==filter.id
							}
						)
					)
				}
		}
	}
if(
	typeof module === 'undefined'
)
	this['Sigma'].portable.StoreFactory
	=	Factory
else
	module.exports
	=	Factory
