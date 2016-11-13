var http = require('http');
var cheerio = require('cheerio');
var json2csv = require('json2csv');
var fs = require('fs');
var dir = 'data';
var options = {
	hostname: 'www.shirts4mike.com',
	path:'/shirts.php',
	method:'GET',
	headers:{}
}

shirts = [];

function writeErrorLog(err){
	var date = new Date().toUTCString();
	var err = '['+date+'] '+err+'\r\n';
	fs.writeFile('error-log.txt',err,{flag:'a+'},function(err){
		if(err){
			console.log('There was an error writing to the error-log.');
		}else{
			console.log('There has been an error: Error has been reported to error log.')
		}
		
	});
}
//helper function for writing csv
function writeCSV(data,fields){
	//capture current date
	var currentDate = new Date();
	var year = currentDate.getFullYear();
	var day = currentDate.getDate();
	var month =  currentDate.getMonth() + 1;
	var time = year+'-'+month+'-'+day;
	
	//variable to hold name of file
	var fileName = '/'+time+'.csv';
	
	//check to see if dir exists
	if(!fs.existsSync(dir)){
			//if not make dir
			fs.mkdirSync(dir);
			
			//varible to store csv content
			var csv = json2csv({data:data, fields:fields});
			
			//create a new csv file
			fs.writeFile(dir+fileName, csv, function(err) {
				if (err){
					writeErrorLog(err);
				}else{
					console.log(dir+fileName+' saved.');
				}	
			});
	}else{
		
		//if dir exists write file and save to dir
		var csv = json2csv({data:data, fields:fields});
		fs.writeFile(dir+fileName, csv, function(err) {
			//if error occurs write error to error-log
			if (err){
				writeErrorLog(err);
			}else{
				console.log(dir+fileName+' saved.');
			}	
		});
	}
	
}

//helper funtion to get a shirt
//takes the shirts path and a callback function as an argument
function getShirt(path,callback){
	if(typeof callback === 'undefined'){
		callback === '';
	}
	var req = http.request({
		hostname: 'www.shirts4mike.com',
		path:'/'+ path,
		method:'GET',
		headers:{}
	},function(response){
		var body = '';
		response.on('data',function(chunk){
			body += chunk;
		});		
		response.on('end',function(){
			var $ = cheerio.load(body);
			var shirtName = $('title').text();
			var shirtPrice = $('.shirt-details').children('h1').children('.price').text();
			var shirtImage =$('.shirt-picture').children('span').children('img').attr('src');
			var shirtUrl = path;
			
			//create timestamp for shirt
			var currentDate = new Date().toUTCString();
			
			var shirt = {
				"Title":shirtName,
				"Price":shirtPrice,
				"ImageURL":shirtImage,
				"URL": path,
				"Time": currentDate
			}
			shirts.push(shirt);
			if(typeof callback === 'function'){
				callback();
			}
			
		});

		response.on('error',function(){
			console.error(response.statusMessage +' [status code: '+response.statusCode+']');
			writeErrorLog( response.statusMessage +' [status code: '+response.statusCode+']');
		});
	});
	
	req.end();
		
}


//helper function used to loop through products and write them to csv
function handleProducts(body,i){
	
	var $ = cheerio.load(body);
	var products = $('.products').children();
	
	var path = products.eq(i).children('a').attr('href');
	getShirt(path,function(){
		//base case
		if(i === products.length - 1){
			var data = shirts;
			var fields = ["Title","Price","ImageURL","URL","Time"];
			writeCSV(data,fields)
			return;
		}else{
			return handleProducts(body,i+1);
		}
	});
	
	
}

function scrape(){
	var req = http.request(options,function(response){
	var rawbody = '';
		response.on('data',function(chunk){
			rawbody += chunk;
		});
		
		response.on('end',function(){
			handleProducts(rawbody,0);
			
		});
		
		
		response.on('error',function(error){
			console.error(response.statusMessage +' [status code: '+response.statusCode+']');
			writeErrorLog( response.statusMessage +' [status code: '+response.statusCode+']');
		}); 
	}).on('error',function(error){
		console.error('There was an error making the request please check connection and try again.');
		writeErrorLog('There was an error making the request please check connection and try again.');
	});

	req.end();	
}

//scrape once at program start
scrape();
//then scrape every 24 hours
setInterval(scrape,86400000);
