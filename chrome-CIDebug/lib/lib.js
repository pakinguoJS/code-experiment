/**
 * Created by pakinguo on 2015/7/11.
 */
(function(window){

    function UrlFilter(origin, pathname, search, hash){
        this.base = pathname ? origin + pathname : origin;
        this.search = init(search);
        this.hash = location.hash;
    }

    function init(query){
        var search = {};
        var tmp = query.substring(1);

        if(tmp){
            tmp = tmp.split('&');
            for(var i = 0,l = tmp.length, idx;i < l;i++){
                idx = tmp[i].indexOf('=');
                search[tmp[i].substring(0, idx)] = tmp[i].substring(idx + 1);
            }
        }

        return search;
    }

    UrlFilter.prototype.getParameters = function(keys){
        if(keys instanceof Array){
            var rs = {};
            for(var i = 0, l = keys.length;i < l;i++){
                rs[keys[i]] = this.search[keys[i]];
            }
            return rs;
        }else{
            return this.search[keys];
        }
    };

    UrlFilter.prototype.reload = function(type){
        var search = [];
        var tmp = this.search;
        for(var itm in tmp){
            search.push(itm + '=' + tmp[itm]);
        }

        if(search.length > 0){
            return this.base + '?' + search.join('&') + this.hash;
        }else{
            return this.base + this.hash;
        }

    }

    UrlFilter.prototype.addParameters = function(keys, val){
        if(typeof keys === 'object'){
            for(var itm in keys){
                this.search[itm] = keys[itm];
            }
        }else{
            this.search[keys] = val;
        }

        return this.reload();
    };

    UrlFilter.prototype.delParameters = function(keys, val){
        if(keys instanceof Array){
            for(var i = 0,l = keys.length;i < l;i++){
                this.search[keys[i]] = null;
                delete this.search[keys[i]];
            }
        }else if(typeof keys === 'object'){
            for(var itm in keys){
                this.search[keys[itm]] = null;
                delete this.search[keys[itm]];
            }
        }else{
            this.search[keys] = null;
            delete this.search[keys];
        }

        return this.reload();
    };

    window.UrlFilter = UrlFilter;

})(window);