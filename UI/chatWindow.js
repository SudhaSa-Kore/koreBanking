function koreBotChat() {
    var bot = require('/KoreBot.js').instance();
    var botMessages = {
        message: "Message...",
        connecting: "Connecting...",
        reconnecting: "Reconnecting..."
    };
    var _botInfo = {};
    var detectScriptTag = /<script\b[^>]*>([\s\S]*?)/gm;
    String.prototype.isNotAllowedHTMLTags = function () {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = this;

        var setFlags = {
            isValid: true,
            key: ''
        };
        if ($(wrapper).find('script').length) {
            setFlags.isValid = false;

        }
        if ($(wrapper).find('link').length && $(wrapper).find('link').attr('href').indexOf('script') !== -1) {
            if(detectScriptTag.test($(wrapper).find('link').attr('href'))) {
                setFlags.isValid = false;
            } else {
                setFlags.isValid = true;
            }
        }
        if ($(wrapper).find('a').length && $(wrapper).find('a').attr('href').indexOf('script') !== -1) {
            if(detectScriptTag.test($(wrapper).find('a').attr('href'))) {
                setFlags.isValid = false;
            } else {
                setFlags.isValid = true;
            }
        }
        if ($(wrapper).find('img').length && $(wrapper).find('img').attr('src').indexOf('script') !== -1) {
            if(detectScriptTag.test($(wrapper).find('img').attr('href'))) {
                setFlags.isValid = false;
            } else {
                setFlags.isValid = true;
            }
        }
        if ($(wrapper).find('object').length) {
            setFlags.isValid = false;
        }

        return setFlags;
    };
    
    String.prototype.escapeHTML = function () {
        //'&': '&amp;',
        var escapeTokens = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        var htmlTags = /[<>"']/g;
        return ('' + this).replace(htmlTags, function (match) {
            return escapeTokens[match];
        });
    };
    
    function xssAttack(txtStr) {
        //   if (compObj && compObj[0] && compObj[0].componentType === "text") {

        var textHasXSS;
        if (txtStr) {
            textHasXSS = txtStr.isNotAllowedHTMLTags();
        }
        if (textHasXSS && !textHasXSS.isValid) {
            txtStr = txtStr.escapeHTML();
        }
        return txtStr;
        //return compObj[0].componentBody;

    }
    
    var helpers = {
        'nl2br': function (str) {
            str = str.replace(/(?:\r\n|\r|\n)/g, '<br />');
            return str;
        },
        'br2nl': function (str) {
            str = str.replace(/<br \/>/g, '\n');
            return str;
        },
        'formatAMPM': function (date) {
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            return strTime;
        },
        'formatDate': function (date) {
            var d = new Date(date);
            return d.toDateString() + " at " + helpers.formatAMPM(d);
        },
        'convertMDtoHTML': function (val, ignoreNewLine,component) {
            var mdre = {};
            //mdre.date = new RegExp(/\\d\(\s*(.{10})\s*\)/g);
            mdre.date = new RegExp(/\\d\(\s*(.{10})\s*(?:,\s*["'](.+?)["']\s*)?\)/g);
            mdre.time = new RegExp(/\\t\(\s*(.{8}\.\d{0,3})\s*\)/g);
            //mdre.datetime = new RegExp(/\\dt\(\s*(.{10})[T](.{12})([z]|[Z]|[+-]\d{4})\s*\)/g);
            mdre.datetime = new RegExp(/\\(d|dt|t)\(\s*([-0-9]{10}[T][0-9:.]{12})([z]|[Z]|[+-]\d{4})[\s]*,[\s]*["']([a-zA-Z\W]+)["']\s*\)/g);
            mdre.num = new RegExp(/\\#\(\s*(\d*.\d*)\s*\)/g);
            mdre.curr = new RegExp(/\\\$\((\d*.\d*)[,](\s*[\"\']\s*\w{3}\s*[\"\']\s*)\)|\\\$\((\d*.\d*)[,](\s*\w{3}\s*)\)/g);
            
            var regEx = {};
            regEx.SPECIAL_CHARS = /[\=\`\~\!@#\$\%\^&\*\(\)_\-\+\{\}\:"\[\];\',\.\/<>\?\|\\]+/;
            regEx.EMAIL = /^[-a-z0-9~!$%^&*_=+}{\']+(\.[-a-z0-9~!$%^&*_=+}{\']+)*@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,255})+$/i;
            regEx.MENTION = /(^|\s|\\n|")@([^\s]*)(?:[\s]\[([^\]]*)\])?["]?/gi;
            regEx.HASHTAG = /(^|\s|\\n)#(\S+)/g;
            regEx.NEWLINE = /\n/g;
            
            var str = val;
            var mmntns = {};
            mmntns.sd = new RegExp(/^(d{1})[^d]|[^d](d{1})[^d]/g);
            mmntns.dd = new RegExp(/^(d{2})[^d]|[^d](d{2})[^d]/g);
            mmntns.fy = new RegExp(/(y{4})|y{2}/g);
            var regexkeys = Object.keys(mdre);
            function matchmap(regexval, stringval) {
                var da;
                var matches = [];
                while ((da = regexval.exec(stringval)) !== null) {
                    var keypair = {};
                    keypair.index = da.index;
                    keypair.matchexp = da[0];
                    if (da.length > 1) {
                        for (var n = 1; n < da.length; n++) {
                            var mstr = "matchval" + n.toString();
                            keypair[mstr] = da[n];
                        }
                    }
                    matches.push(keypair);
                }
                return matches;
            }
            function ucreplacer(match) {
                return match.toUpperCase();
            }
            for (var j = 0; j < regexkeys.length; j++) {
                var k;
                switch (regexkeys[j]) {
                    case 'date':
                        var strvald = str;
                        var datematcharray = matchmap(mdre.date, strvald);
                        if (datematcharray.length) {
                            for (k = 0; k < datematcharray.length; k++) {
                                //var fdate = moment(datematcharray[k].matchval).format('DD,dd,MM,YYY');
                                var fdate = new Date(datematcharray[k].matchval1).toLocaleDateString();
                                fdate = ' ' + fdate.toString() + ' ';
                                str = str.replace(datematcharray[k].matchexp.toString(), fdate);
                            }
                        }
                        break;
                    case 'time':
                        var strvalt = str;
                        var timematcharray = matchmap(mdre.time, strvalt);
                        if (timematcharray.length) {
                            for (k = 0; k < timematcharray.length; k++) {
                                var ftime = new Date(timematcharray[k].matchval1).toLocaleTimeString();
                                ftime = ' ' + ftime.toString() + ' ';
                                str = str.replace(timematcharray[k].matchexp.toString(), ftime);
                            }
                        }
                        break;
                    case 'datetime':
                        var strvaldt = str;
                        var dtimematcharray = matchmap(mdre.datetime, strvaldt);
                        if (dtimematcharray.length) {
                            for (k = 0; k < dtimematcharray.length; k++) {
                                var ms = '';
                                var mergekeylength = Object.keys(dtimematcharray[k]).length - 2;
                                for (var l = 2; l < mergekeylength; l++) {
                                    var keystr = "matchval" + l.toString();
                                    ms += dtimematcharray[k][keystr];
                                }
                                var foptionstring = "matchval" + mergekeylength.toString();
                                var fmtstr = dtimematcharray[k][foptionstring];
                                fmtstr = fmtstr.replace(mmntns.fy, ucreplacer);
                                fmtstr = fmtstr.replace(mmntns.dd, ucreplacer);
                                fmtstr = fmtstr.replace(mmntns.sd, ucreplacer);
                                //var fdtime = new Date(dtimematcharray[k].matchval).toLocaleString();
                                var fdtime = moment(ms).format(fmtstr);
                                fdtime = ' ' + fdtime.toString() + ' ';
                                str = str.replace(dtimematcharray[k].matchexp.toString(), fdtime);
                            }
                        }
                        break;
                    case 'num':
                        var strnumval = str;
                        var nummatcharray = matchmap(mdre.num, strnumval);
                        if (nummatcharray.length) {
                            for (k = 0; k < nummatcharray.length; k++) {
                                var fnum = Number(nummatcharray[k].matchval1).toLocaleString();
                                fnum = ' ' + fnum.toString() + ' ';
                                str = str.replace(nummatcharray[k].matchexp.toString(), fnum);
                            }
                        }
                        break;
                    case 'curr':
                        var strcurval = str;
                        var currmatcharray = matchmap(mdre.curr, strcurval);
                        var browserLang = window.navigator.language || window.navigator.browserLanguage;
                        var curcode = new RegExp(/\w{3}/);
                        if (currmatcharray.length) {
                            for (k = 0; k < currmatcharray.length; k++) {
                                var currops = {}, fcode;
                                currops.style = 'currency';
                                if (currmatcharray[k].matchval2) {
                                    fcode = curcode.exec(currmatcharray[k].matchval2);
                                }
                                currops.currency = fcode[0].toString();
                                var fcurr = Number(currmatcharray[k].matchval1).toLocaleString(browserLang, currops);
                                //check for browser support if browser doesnot suppor we get the same value back and we append the currency Code
                                if (currmatcharray[k].matchval1.toString() === fcurr.toString()) {
                                    fcurr = ' ' + fcurr.toString() + ' ' + currops.currency;
                                } else {
                                    fcurr = ' ' + fcurr.toString() + ' ';
                                }
                                str = str.replace(currmatcharray[k].matchexp.toString(), fcurr);
                            }
                        }
                        break;
                }
            }
            function nextLnReplacer(match, p1, offset, string) {
                return "<br/>";
            }
            var nextln = regEx.NEWLINE;
            str = xssAttack(str);

            //Adding target=web for links if authUrl is true
            if (component && component.componentData && component.componentData.bot && component.componentData.bot.authUrl) {
                var rawHTML = str;
                var $div = $('<div>').html(rawHTML);

                var _aDivs = $div.find('a');
                _aDivs.toArray().forEach(function (ele) {
                    ele.href += '&target=web';
                    $(ele).attr('data-authUrl', ele.href);
                });
                str = $div.html();
            }
            //Adding target=web for links if actionUrl is true
            if (component && component.componentData && component.componentData.bot && component.componentData.bot.actionUrl) {
                var rawHTML_A = str;
                var $div_A = $('<div>').html(rawHTML_A);
                var _aDivs_A = $div_A.find('a');
                _aDivs_A.toArray().forEach(function (ele) {
                    ele.href += '&target=web';
                    $(ele).attr('data-actionUrl', ele.href);
                });
                str = $div_A.html();
            }
            
            return helpers.nl2br(str);
        }
    };
    function chatWindow(cfg) {
        this.config = {
            "chatTitle": "Kore Bot Chat",
            "container": "body",
            "allowIframe": false,
            "botOptions": cfg.botOptions
        };
        if (cfg && cfg.chatContainer) {
            delete cfg.chatContainer;
        }
        this.config = $.extend(this.config, cfg);
        this.init();
    }

    chatWindow.prototype.init = function () {
        var me = this;
        _botInfo = me.config.botOptions.botInfo;
        me.config.botOptions.botInfo = {chatBot:_botInfo.name,taskBotId :_botInfo._id};
        var tempTitle = _botInfo.name;
        me.config.botMessages = botMessages;

        me.config.chatTitle = me.config.botMessages.connecting;
        var chatWindowHtml = $(me.getChatTemplate()).tmpl(me.config);
        me.config.chatContainer = chatWindowHtml;

        me.config.chatTitle = tempTitle;
        bot.init(me.config.botOptions);
        me.render(chatWindowHtml);
    };

    chatWindow.prototype.destroy = function () {
        var me = this;
        $('.kore-chat-overlay').hide();
        bot.close();
        if (me.config && me.config.chatContainer) {
            me.config.chatContainer.remove();
        }
    };

    chatWindow.prototype.resetWindow = function() {
        var me = this;
        me.config.chatContainer.find('.kore-chat-header .header-title').html( me.config.botMessages.reconnecting);
        me.config.chatContainer.find('.chat-container').html("");
        bot.close();
        bot.init(me.config.botOptions);
    };

    chatWindow.prototype.bindEvents = function () {
        var me = this;
        var _chatContainer = me.config.chatContainer;
        _chatContainer.draggable({
                handle: _chatContainer.find(".kore-chat-header .header-title"),
                containment: "window",
                scroll: false
        }).resizable({
                handles: "n, e, w, s",
                containment: "html"
        });

        _chatContainer.off('keyup', '.chatInputBox').on('keyup', '.chatInputBox', function (event) {
            var _footerContainer = $(me.config.container).find('.kore-chat-footer');
            var _bodyContainer = $(me.config.container).find('.kore-chat-body');
            _bodyContainer.css('bottom', _footerContainer.outerHeight());
        });
        _chatContainer.off('keydown', '.chatInputBox').on('keydown', '.chatInputBox', function (event) {
            var _this = $(this);
            var _footerContainer = $(me.config.container).find('.kore-chat-footer');
            var _bodyContainer = $(me.config.container).find('.kore-chat-body');
            _bodyContainer.css('bottom', _footerContainer.outerHeight());
            if (event.keyCode === 13) {
                event.preventDefault();
                me.sendMessage(_this);
                return;
            }
        });
        
        _chatContainer.off('paste', '.chatInputBox').on('paste', '.chatInputBox', function (event) {
            event.preventDefault();
            var _clipboardData = event.clipboardData || (event.originalEvent && event.originalEvent.clipboardData) || window.clipboardData;
            if(_clipboardData){
                $(this).html(helpers.nl2br(_clipboardData.getData('text').escapeHTML()));
            }
        });
        _chatContainer.off('click', '.sendChat').on('click', '.sendChat', function (event) {
            var _footerContainer = $(me.config.container).find('.kore-chat-footer');
            me.sendMessage(_footerContainer.find('.chatInputBox'));
        });
        
        _chatContainer.on('click','li a',function(e){
            e.preventDefault();
            var a_link = $(this).attr('href');
            if(me.config.allowIframe === true){
                me.openPopup(a_link);
            }
            else{
                var _tempWin = window.open(a_link,"_blank");
            }
        });

        _chatContainer.off('click', '.close-btn').on('click', '.close-btn', function (event) {
            me.destroy();
        });

        _chatContainer.off('click', '.minimize-btn').on('click', '.minimize-btn', function (event) {
            if (me.minimized === true) {
                _chatContainer.removeClass("minimize");
                me.minimized = false;
                if(me.expanded === false){
                    _chatContainer.draggable({
                        handle: _chatContainer.find(".kore-chat-header .header-title"),
                        containment: "window",
                        scroll: false
                    });
                }
            } else
            {
                _chatContainer.addClass("minimize");
                if(me.expanded === false && _chatContainer.hasClass("ui-draggable")) {
                    _chatContainer.draggable("destroy");
                }
                _chatContainer.find('.minimized-title').html("Talk to "+ me.config.chatTitle);
                me.minimized = true;
            }
        });
        
        _chatContainer.off('click', '.expand-btn').on('click', '.expand-btn', function (event) {
            if($('.kore-chat-overlay').length === 0) {
                $(me.config.container).append('<div class="kore-chat-overlay"></div>');
            }
            if (me.expanded === true) {
                $('.kore-chat-overlay').hide();
                $(this).attr('title',"Expand");
                _chatContainer.removeClass("expanded");
                me.expanded = false;
                _chatContainer.draggable({
                    handle: _chatContainer.find(".kore-chat-header .header-title"),
                    containment: "window",
                    scroll: false
                }).resizable({
                        handles: "n, e, w, s",
                        containment: "html"
                });
            } else {
                $('.kore-chat-overlay').show();
                $(this).attr('title',"Collapse");
                _chatContainer.addClass("expanded");
                _chatContainer.draggable("destroy").resizable("destroy");
                me.expanded = true;
            }
            var container_pos_left = _chatContainer.position().left + _chatContainer.width();
            if(container_pos_left > $(window).width()){
                _chatContainer.css('left',_chatContainer.position().left - (container_pos_left - $(window).width() + 10)  + "px" );
            }
        });
        $('body').on('click','.kore-chat-overlay, .kore-chat-window .minimize-btn',function(){
            if(me.expanded === true){
                $('.kore-chat-window .expand-btn').trigger('click');
            }
        });
        
        _chatContainer.off('click', '.minimized').on('click', '.minimized,.minimized-title', function (event) {
            _chatContainer.removeClass("minimize");
            me.minimized = false;
            _chatContainer.draggable({
                handle: _chatContainer.find(".kore-chat-header .header-title"),
                containment: "window",
                scroll: false
            });
        });

        _chatContainer.off('click', '.reload-btn').on('click', '.reload-btn',function(event){
            $(this).addClass("disabled").prop('disabled',true);
            me.resetWindow();
        });
        bot.on("open", function (response) {
            var _chatInput = _chatContainer.find('.kore-chat-footer .chatInputBox');
            _chatContainer.find('.kore-chat-header .header-title').html(me.config.chatTitle).attr('title',me.config.chatTitle);
            _chatContainer.find('.kore-chat-header .disabled').prop('disabled',false).removeClass("disabled");
            _chatInput.focus();
        });

        bot.on("message", function (message) {
            if(me.popupOpened === true){
                $('.kore-auth-popup .close-popup').trigger("click");
            }
            var tempData = JSON.parse(message.data);

            if (tempData.from === "bot" && tempData.type === "bot_response")
            {
                me.renderMessage(tempData);
            }
            else if(tempData.from === "self" && tempData.type === "user_message"){
                var tempmsg = tempData.message;
                
                var msgData = {
                    'type': "currentUser",
                    "message": [{
                        'type': 'text',
                        'cInfo': {'body':tempmsg.body},
                        'clientMessageId': tempData.id
                    }],
                    "createdOn": tempData.id
                };
                me.renderMessage(msgData);
            }
        });
    };
    
    chatWindow.prototype.bindIframeEvents = function(authPopup){
        var me = this;
        authPopup.on('click','.close-popup',function(){
           $(this).closest('.kore-auth-popup').remove();
           $('.kore-auth-layover').remove();
           me.popupOpened = false;
        });
        
        var ifram = authPopup.find('iframe')[0];
        
        ifram.addEventListener('onload',function(){
            console.log(this);            
        },true);
    };
    
    chatWindow.prototype.render = function (chatWindowHtml) {
        var me = this;
        $(me.config.container).append(chatWindowHtml);

        if (me.config.container !== "body") {
            $(me.config.container).addClass('pos-relative');
            $(me.config.chatContainer).addClass('pos-absolute');
        }

        me.bindEvents();
    };

    chatWindow.prototype.sendMessage = function (chatInput) {
        var me = this;
        if (chatInput.text().trim() === "") {
            return;
        }
        var _bodyContainer = $(me.config.chatContainer).find('.kore-chat-body');
        var _footerContainer = $(me.config.chatContainer).find('.kore-chat-footer');
        var clientMessageId = new Date().getTime();

        var msgData = {
            'type': "currentUser",
            "message": [{
                'type': 'text',
                'cInfo': {'body':chatInput.html()},
                'clientMessageId': clientMessageId
            }],
            "createdOn": clientMessageId
        };

        var messageToBot = {};
        messageToBot["clientMessageId"] = clientMessageId;
        messageToBot["message"] = {body: helpers.br2nl(chatInput.html()), attachments: []};
        messageToBot["resourceid"] = '/bot.message';

        bot.sendMessage(messageToBot, function messageSent() {

        });
        chatInput.html("");
        _bodyContainer.css('bottom', _footerContainer.outerHeight());

        me.renderMessage(msgData);
    };

    chatWindow.prototype.renderMessage = function (msgData) {
        var me = this;
        var _chatContainer = $(me.config.chatContainer).find('.chat-container');

        var messageHtml = $(me.getChatTemplate("message")).tmpl({
            'msgData': msgData,
            'helpers':helpers
        });

        _chatContainer.append(messageHtml);

        //me.formatMessages(messageHtml);
        _chatContainer.animate({
            scrollTop: _chatContainer.prop("scrollHeight")
        }, 0);
    };

    chatWindow.prototype.formatMessages = function (msgContainer){
    /*adding target to a tags */
        $(msgContainer).find('a').attr('target','_blank');
    };
    
    chatWindow.prototype.openPopup = function(link_url){
        var me = this;
        var popupHtml = $(me.getChatTemplate("popup")).tmpl({
            "link_url":link_url
        });
        $(me.config.container).append(popupHtml);
        me.popupOpened = true;
        me.bindIframeEvents($(popupHtml));
    };

    chatWindow.prototype.getChatTemplate = function (tempType) {
        var chatFooterTemplate =
                '<div class="footerContainer pos-relative"> \
			<div class="chatInputBox" contenteditable="true" placeholder="${botMessages.message}"></div> \
			<div class="chatSendMsg">Press enter to send</div> \
		</div>';

        var chatWindowTemplate = '<script id="chat_window_tmpl" type="text/x-jqury-tmpl"> \
			<div class="kore-chat-window"> \
                                <div class="minimized-title"></div> \
                                <div class="minimized"><span class="messages"></span></div> \
				<div class="kore-chat-header"> \
					<div class="header-title" title="${chatTitle}">${chatTitle}</div> \
					<div class="chat-box-controls"> \
                                                <button class="reload-btn" title="Reconnect">&#10227;</button> \
						<button class="minimize-btn" title="Minimize">&minus;</button> \
                                                <button class="expand-btn" title="Expand"><span></span></button>\
						<button class="close-btn" title="Close">&times;</button> \
					</div> \
				</div> \
				<div class="kore-chat-body"> \
					<ul class="chat-container"></ul> \
				</div> \
				<div class="kore-chat-footer">' + chatFooterTemplate + '</div> \
			</div> \
		</script>';

        var msgTemplate = ' <script id="chat_message_tmpl" type="text/x-jqury-tmpl"> \
			{{if msgData.message}} \
			{{each(key, msgItem) msgData.message}} \
                        {{if msgItem.cInfo && msgItem.type === "text"}} \
			<li {{if msgData.type !== "bot_response"}}id="msg_${msgItem.clientMessageId}"{{/if}} class="{{if msgData.type === "bot_response"}}fromOtherUsers{{else}}fromCurrentUser{{/if}} {{if msgData.icon}}with-icon{{/if}}"> \
                                {{if msgData.createdOn}}<div class="extra-info">${helpers.formatDate(msgData.createdOn)}</div>{{/if}} \
                                {{if msgData.icon}}<div class="profile-photo"> <div class="user-account avtar" style="background-image:url(${msgData.icon})"></div> </div> {{/if}} \
                                <div class="messageBubble">\
                                    {{if msgData.type === "bot_response"}} {{html helpers.convertMDtoHTML(msgItem.cInfo.body)}} {{else}} {{html msgItem.cInfo.body}} {{/if}} \
                                </div> \
			</li> \
                        {{/if}} \
			{{/each}} \
			{{/if}} \
		</scipt>';
        
        var popupTemplate = '<script id="kore_popup_tmpl" type="text/x-jquery-tmpl"> \
                <div class="kore-auth-layover">\
                    <div class="kore-auth-popup"> \
                        <div class="popup_controls"><span class="close-popup" title="Close">&times;</span></div> \
                        <iframe id="authIframe" src="${link_url}"></iframe> \
                    </div> \
                </div>\
        </script>';
        if (tempType === "message") {
            return msgTemplate;
        } else if(tempType === "popup"){
            return popupTemplate;
        } else {
            return chatWindowTemplate;
        }
    };
    
    var chatInitialize;
    
    window.onbeforeunload = function(){
        if (chatInitialize && $(chatInitialize.config.chatContainer).length > 0) {
            chatInitialize.destroy();
            return null;
        }
    }

    this.show = function (cfg) {
        if ($('body').find('.kore-chat-window').length > 0)
        {
            return false;
        }
        chatInitialize = new chatWindow(cfg);
        return this;
    };
    this.destroy = function () {
        if (chatInitialize && chatInitialize.destroy) {
            chatInitialize.destroy();
        }
    };
    return {
        show: show,
        destroy: destroy
    };
}