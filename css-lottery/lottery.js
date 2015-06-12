(function (window, document) {
    function Rotate() {
        // css class name
        this.prefixName = 'pk-rotate';
        
        // css prefix for transition or transform
        this.prefix = '';
        
        // delay for trigger rotate in short time
        this.delay = 1;

        // initial style instance
        document.body.appendChild(document.createElement('style'));
        this.style = document.styleSheets.item(document.styleSheets.length - 1);

        // check browser
        var checkBrowser = "transformProperty WebkitTransform MozTransform".split(" ");
        var tmp = document.head.style;
        for (var a = 0; a < checkBrowser.length; a++) {
            if (tmp[checkBrowser[a]] !== undefined) {
                switch (checkBrowser[a]) {
                    case "WebkitTransform":
                        this.prefix = '-webkit-';
                        break;
                    case "MozTransform":
                        this.prefix = '-moz-';
                        this.delay = 20;
                        break;
                }
                break;
            }
        }

        // effect
        this.effect = {
            'linear': 'linear',
            'ease': 'ease',
            'easeIn': 'ease-in',
            'easeOut': 'ease-out',
            'easeInOut': 'ease-in-out',
            'easeInOutPro': 'cubic-bezier(0.000, 0.750, 0.310, 1.000)'
        };

        // hash exited
        this.hash = {};
    }

    Rotate.prototype.insertFrames = function (name, csstext) {
        this.style.insertRule('@' + this.prefix + 'keyframes ' + name + csstext, 0);
    };

    Rotate.prototype.insertRule = function (name, csstext) {
        this.style.insertRule(name + csstext, 0);
    };

    Rotate.prototype.modifyRule = function (rule, key, csstext) {
        if (rule.findRule(key)) {
            rule.deleteRule(key);
        }
        if (typeof rule.appendRule === 'function') {
            rule.appendRule(csstext);
        } else if (typeof rule.insertRule === 'function') {
            rule.insertRule(csstext);
        } else {
            console.log('error');
        }
    };

    Rotate.prototype.rotate = function (id, params) {
        // check parameters
        params.duration ? params.duration /= 1000 : params.duration = 1;
        params.effect ? null : params.effect = 'easeInOut';
        params.angle ? null : params.angle = 360;
        params.callback ? null : params.callback = function () {
        };
        params.times ? null : params.times = 1;
        params.delay ? null : params.delay = 0;

        // generate keyframes and css class
        var frameName = this.prefixName + '-keyframe-' + id + '-' + params.duration + '-' + params.effect;
        var className = this.prefixName + '-class-' + id + '-' + params.duration + '-' + params.effect;

        // if keyframes has been created, just modify its rotate angle
        if (this.hash[frameName]) {
            this.modifyRule(this.hash[frameName], '100%', '100%{{prefix}transform:rotate({angle}deg);}'.replace(/\{prefix\}/g, this.prefix).replace(/\{angle\}/, params.angle));
            this.triggerClass(id, className);
        } else {
            // hash
            this.insertFrames(frameName, '{0%{{prefix}transform:rotate(0deg);}100%{{prefix}transform:rotate({angle}deg);}}'.replace(/\{prefix\}/g, this.prefix).replace(/\{angle\}/, params.angle));
            this.hash[frameName] = this.style.cssRules.item(0);
            this.insertRule('.' + className, ('{' +
                    '{prefix}animation-name:' + frameName +
                    ';{prefix}animation-delay:' + params.delay + 's' +
                    ';{prefix}animation-duration:' + params.duration + 's' +
                    ';{prefix}animation-timing-function:' + this.effect[params.effect] +
                    ';{prefix}animation-iteration-count:' + params.times +
                    ';{prefix}animation-fill-mode:forwards' + '}').replace(/\{prefix\}/g, this.prefix));

            // add class to node
            UtilAddClass(id, className);

            // bind animation end event
            var target = _(id);
            target.addEventListener('webkitAnimationEnd', function () {
                params.callback();
            }, false);
            target.addEventListener('animationend', function () {
                params.callback();
            }, false);
        }

    };

    Rotate.prototype.triggerClass = function(id, name){
        UtilRemoveClass(id, name);
        var i = setTimeout(function () {
            UtilAddClass(id, name);
            clearTimeout(i);
        }, this.delay);
    };

    function _(id) {
        return document.getElementById(/^#/.test(id) ? id.substr(1) : id);
    }

    function UtilAddClass(id, added) {
        var node = _(id);
        var list = node.classList;
        var existed = false;
        for (var i = 0, l = list.length; i < l; i++) {
            if (added === list[i]) {
                existed = true;
                break;
            }
        }
        if (!existed) {
            node.className = node.className + ' ' + added;
        }
    }

    function UtilRemoveClass(id, name) {
        var node = _(id);
        node.className = node.className.replace(' ' + name, '');
    }

    // instance
    var pkrotate = new Rotate();

    if (typeof define === 'function' && (define.amd || define.cmd)) {
        define(function () {
            return pkrotate;
        });
    }
})(window, document);