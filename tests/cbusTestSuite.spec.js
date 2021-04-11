const expect = require('chai').expect;
var winston = require('./config/winston_test.js');
var itParam = require('mocha-param');
const net = require('net')
const io = require('socket.io-client');
var cbusLib = require('cbusLibrary')

const NET_PORT = 5550;
const NET_ADDRESS = "127.0.0.1"

function decToHex(num, len) {return parseInt(num).toString(16).toUpperCase().padStart(len, '0');}

function cbusTransmit(client, msgData)
    {
        winston.info({message: "Transmit: " + msgData + " " + cbusLib.decode(msgData).text});
    	client.write(msgData);
    }


describe('cbus test suite tests', function(){

	let testClient = undefined;
    let messagesIn = []
    
    var module = {
        "nodeNumber":0,
        "NVcount":0
    }

	before(function() {
		winston.info({message: ' '});
		winston.info({message: '======================================================================'});
		winston.info({message: '---------------------------- cbus test suite -------------------------'});
		winston.info({message: '======================================================================'});
		winston.info({message: ' '});

        testClient = new net.Socket()
        testClient.connect(NET_PORT, NET_ADDRESS, function () {
			winston.debug({message: 'TEST: Client Connected at port ' + testClient.remotePort});
        })

        testClient.on('data', function (data) {
            const msgArray = data.toString().split(";");
  			for (var msgIndex = 0; msgIndex < msgArray.length - 1; msgIndex++) {
                msgArray[msgIndex] += ';'           // replace terminator removed by split function
                winston.info({message: 'TEST: Test client: data received ' + msgArray[msgIndex] + " " + cbusLib.decode(msgArray[msgIndex]).text});
                messagesIn.push(msgArray[msgIndex])
            }
        })
        
        testClient.on('end', function () {
            winston.info({message: 'TEST: Client Disconnected at port ' + testClient.remotePort});
        });
			

        testClient.on('error', function(err) {
            winston.info({message: 'TEST: Socket error ' + err});
        });

	})
    
    beforeEach (function() {
        messagesIn = [];
        // ensure expected CAN header is reset before each test run
        cbusLib.setCanHeader(2, 60)
   		winston.info({message: ' '});   // blank line to separate tests
    })

	after(function() {
        testClient.end()
   		winston.info({message: ' '});                       // blank line to separate tests
   		winston.info({message: 'TEST: tests finished '});
    });
	



    // 0D QNN
    //
	it("QNN test", function (done) {
		winston.info({message: 'TEST: BEGIN QNN test'});
        msgData = cbusLib.encodeQNN();
        cbusTransmit(testClient, msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(messagesIn[0].length).to.equal(20), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('B6'), 'opcode';
            module.nodeNumber = cbusLib.decode(messagesIn[0]).nodeNumber
            winston.info({message: ">> nodeNumber: " + module.nodeNumber});
            winston.info({message: "check other module parameters are correct"});
			done();
		}, 100);
	})

    // 10 RQNP
    //
	it("RQNP test", function (done) {
		winston.info({message: 'TEST: BEGIN RQNP test'});
        msgData = cbusLib.encodeRQNP();
        cbusTransmit(testClient, msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(messagesIn[0].length).to.equal(24), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('EF'), 'opcode';
            module.NVcount = cbusLib.decode(messagesIn[0]).param6
            winston.info({message: ">> node variable count: " + module.NVcount});
            winston.info({message: "check other module parameters are correct"});
			done();
		}, 100);
	})

})