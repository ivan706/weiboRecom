/*
 * default index
 * author Ivan Wang@CCTU
 */
var async = require('async');
var request = require('request');
var conf = require('../config.json');

// change appkey to yours
var appkey = '2940042333';
var secret = 'fec8a9caafb14d90c0ad03e9195e58fa';

var personData = "";
module.exports = {
	/**
	 * 路由定义
	 */
	init: function(app){
		app.get('/', this.index);
		app.get('/login', this.login);
		app.get('/logout', this.logout);
		app.get('/user/auth', this.auth);
		app.get('/getRd', this.getRd);
		app.get('/getSchool', this.getSchool);
		app.get('/addFriend',this.addFriend);
	},

	index: function(req, res) {
		//获取accesstoken
		function getAccessToken(cbk) {
			var code = req.param("code") || req.session.access_code;
			var options = {
				url: "https://api.weibo.com/oauth2/access_token?client_id=2940042333&client_secret=fec8a9caafb14d90c0ad03e9195e58fa&grant_type=authorization_code&redirect_uri=http://weibo.cctu.com:3000/&code=" + code,
				method: "POST"
			};
			request(options, function(error, response, body){
				// console.log('token:',error,response.statusCode);
				if (!error && response.statusCode == 200) {
					req.session.access_code = code;
					var info = JSON.parse(body);
					// console.log('token:',info);
					req.session.access_token = info.access_token;
					cbk(null, info);
				}else{
					req.session.access_code = null;
					cbk('get access_token error');
				}
			});
		}
		//获取用户信息
		var self = this;
		function getUserInfo(param, cbk){
			var uid = param.uid,access_token=param.access_token;
			var url = "https://api.weibo.com/2/users/show.json?uid="+uid+"&access_token="+access_token;
			var options = {
				url: url,
				method: "GET"
			};
			request(options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					var info = JSON.parse(body);
					info.access_token = access_token;
					cbk(null, info);
				}else{
					cbk('get infomation error')
				}
			})
		}
		function getUserTag(param, cbk){
			var access_token=req.session.access_token;
			var url = "https://api.weibo.com/2/tags.json?uid="+param.id+"&access_token="+access_token;
			var options = {
				url: url,
				method: "GET"
			};
			request(options, function(error, response, body){
				// console.log("usertag:",error);
				if (!error && response.statusCode == 200) {
					var info = JSON.parse(body);
					var tags = [];
					for (var i = 0; i < info.length; i++) {
						// console.log(info[i])
						for(var c in info[i]){
							if(c != "weight")
								tags.push(info[i][c]);
						}
					}
					// console.log(info);
					param.tags = tags;
					cbk(null, param);
				}else{
					cbk('get tag error')
				}
			})
		}
		var code =  req.param("code") || ""
		if (code == "" && !req.session.access_code) {
			personData = "";
			res.render('index', {
				title: 'CCTU新浪好友推荐系统',
				login:false
			});
		} else {
			async.waterfall([getAccessToken,getUserInfo,getUserTag],function(err, result){
				if(err != null){
					// console.log(err);
					res.render('index', {
						title: 'CCTU新浪好友推荐系统',
						login:false
					});
				}else{
					var rtn = {
						id:result.id,
						name:result.name,
						location:result.location,
						description:result.description,
						followers_count:result.followers_count,
						statuses_count:result.statuses_count,
						friends_count:result.friends_count,
						avatar_hd:result.avatar_hd,
						avatar_large:result.avatar_large,
						sex:result.gender == 'm'?1:0,
						tags:result.tags,
						province:result.province,
						recommond:{
							area:[],
							job:[],
							edu:[],
							tag:[],
							complex:[]
						}
					};
					personData = rtn;
					res.render('index', {
						title: 'CCTU新浪好友推荐系统',
						data:rtn,
						login:true
					});
				}
			});
		}
	},
	login: function(req, res) {
		personData = "";
		//获取oauthtoken
		var url = "https://api.weibo.com/oauth2/authorize?client_id=2940042333&response_type=code&redirect_uri=http://weibo.cctu.com:3000/";
		res.send({
			status: 1,
			url: url
		});
		// res.redirect(url);
	},
	logout: function(req, res){
		req.session.access_code = null;
		personData = "";
		var url = "https://api.weibo.com/oauth2/revokeoauth2?access_token="+req.session.access_token;
		var options = {
				url: url,
				method: "GET"
			};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var info = JSON.parse(body);
				res.render('index', {
					title: 'CCTU新浪好友推荐系统',
					login:false
				});
			} else {
				res.render('index', {
					title: 'CCTU新浪好友推荐系统',
					login:false
				});
			}
		});
		req.session.access_token = null;
	},
	getRd: function(req, res){
		if (req.session.access_token == null || personData == "") {
			res.redirect('http://weibo.cctu.com:3000/');
			return;
		}
		var constellation = req.param('constellation');
		var job = req.param('job');
		var edu = req.param('edu');
		var rtn = personData;

		var url = conf.dmserver + "?uid=" + rtn.id + "&tags=" + rtn.tags.join(',') + "&sex=" + rtn.sex + "&area=" + rtn.province + "&job=123&edu=" + encodeURI(edu) + "&vip=0&birthday=" + constellation;
		var options = {
			url: url,
			method: "GET"
		};
		request(options, function(error, response, body) {
			if (!error && response.statusCode == 200) {
				var info = JSON.parse(body);
				rtn.recommond.area = info.data.area || [];
				rtn.recommond.job = info.data.job || [];
				rtn.recommond.tag = info.data.tags || [];
				rtn.recommond.edu = info.data.edu || [];
				rtn.recommond.complex = info.data.complex || [];
				res.render('recommond', {
					title: 'CCTU新浪好友推荐系统',
					data: rtn,
					login: true
				});
			} else {
				//cbk('get tag error')
				res.render('recommond', {
					title: 'CCTU新浪好友推荐系统',
					data: rtn,
					login: true
				});
			}
		});
		// rtn.recommond={
		// 	area: [{uid:12217652,name:'秋实',avatar:'http://img1.touxiang.cn/uploads/20121030/30-021803_660.jpg'},{uid:12217654,name:'秋实q',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'},{uid:12217656,name:'秋实p',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'}],
		// 	job: [],
		// 	edu: [],
		// 	tag: [{uid:12217652,name:'秋实',avatar:'http://img1.touxiang.cn/uploads/20121030/30-021803_660.jpg'},{uid:12217654,name:'秋实q',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'},{uid:12217656,name:'秋实p',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'}],
		// 	complex: [{uid:12217652,name:'秋实',avatar:'http://img1.touxiang.cn/uploads/20121030/30-021803_660.jpg'},{uid:12217654,name:'秋实q',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'},{uid:12217656,name:'秋实p',avatar:'http://img1.2345.com/duoteimg/qqTxImg/2013/04/22/136670944512.jpg'}]
		// }
		// res.render('recommond', {
		// 				title: 'CCTU微博推荐系统',
		// 				data:rtn,
		// 				login:true
		// 			});
	},
	getSchool: function(req, res){
		var province = req.param("city");
		var capital = req.param("capital");
		var rtn = [];
		var url = "https://api.weibo.com/2/account/profile/school_list.json?province="+province+"&capital="+capital+"&access_token="+req.session.access_token;
			var options = {
				url: url,
				method: "GET"
			};
			request(options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					var info = JSON.parse(body);
					for(var i=0;i<info.length;i++){
						// console.log(info[i])
						rtn.push(info[i].name);
					}
					//console.log('recomend:',rtn);
					//param.tags = info.tags;
					res.json({status:1,schools:rtn});
				}else{
					res.json({status:0});
				}
			})
	},
	addFriend: function(req, res){
		var uid = req.param("uid");
		var rtn = [];
		var url = "https://api.weibo.com/2/friendships/create.json?uid="+uid+"&access_token="+req.session.access_token;
			var options = {
				url: url,
				method: "POST"
			};
			request(options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					var info = JSON.parse(body);
					
					//console.log('recomend:',rtn);
					//param.tags = info.tags;
					res.json({status:1,schools:rtn});
				}else{
					res.json({status:0});
				}
			})
	},
	auth: function(req, res){
		req.session.oauth_token = null;
		req.session.oauth_token_secret = null;
		req.session.oauth_verifier = null;
		req.session.oauth_access_token = null;
		req.session.oauth_access_token_secret = null;
		var user = req.param("user") || "";
		var pwd = req.param("pwd") || "";
		//if(user==""||pwd=="") this.error(req, res, "param error");
		var cbk = function(param){
			// console.log(param);
		};
		var url = "https://api.weibo.com/oauth2/authorize?client_id=2940042333&response_type=code&redirect_uri=http://weibo.cctu.com:3000/";
		res.send({status:1,url:url});

	},
	error: function(req, res, msg){
		res.render('login',{
			title:'CCTU微博推荐系统登录界面',
			error:msg
		})
	}

}
