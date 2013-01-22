var	Factory
=	function(_)
	{
	return	function(sources_list,loader)
		{
			this.sources
			=	_(sources_list).objMap(loader)
			this.filter
			=	function(what,filter)
				{
				//console.log("filter",filter)
				var	self
				=	this
				filter['type']
				=	filter.type||undefined
				filter['offset']
				=	filter.page||1 //El offset al utilizar splice debe estar incrementado en 1
				filter['limit']
				=	filter.ipp||10
					return	filter.through
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
							).splice(filter.offset,filter.limit)
							:(filter.key&&filter.id)
								?_(self.sources[what])
								.filter(
									function(item)
									{
									return	item[filter.key]==filter.id
									}
								).splice(filter.offset-1,filter.limit)
								:((!filter.key)&&(!filter.id))
									?self.sources[what].splice(filter.offset-1,filter.limit)
									:[]
				}
			this.find
			=	function(what,filter)
				{
					return 	_(this.sources[what])
								.find(
									function(item)
									{
									return	item[filter.key]==filter.id
									}
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
