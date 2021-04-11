const expect = require('chai').expect;
var winston = require('./config/winston_test.js');
var itParam = require('mocha-param');
const net = require('net')
const io = require('socket.io-client');
var cbusLib = require('cbusLibrary')

const NET_PORT = 5550;
const NET_ADDRESS = "127.0.0.1"

function decToHex(num, len) {return parseInt(num).toString(16).toUpperCase().padStart(len, '0');}


describe('cbus test suite tests', function(){

	let testClient = undefined;
    let messagesIn = []
    
    var module = {
        "nodeNumber": null,
        "NVcount": null
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
                winston.info({message: 'TEST: Receive:  << ' + msgArray[msgIndex] + " " + cbusLib.decode(msgArray[msgIndex]).text});
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
	

    function cbusTransmit(msgData)
        {
            winston.info({message: "TEST: Transmit: >> " + msgData + " " + cbusLib.decode(msgData).text});
            testClient.write(msgData);
        }



    // 0D QNN
    //
	it("QNN test", function (done) {
		winston.info({message: 'TEST: BEGIN QNN test'});
        msgData = cbusLib.encodeQNN();
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(messagesIn[0].length).to.equal(20), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('B6'), 'opcode';
            module.nodeNumber = cbusLib.decode(messagesIn[0]).nodeNumber
            winston.info({message: "TEST: nodeNumber received: " + module.nodeNumber});
            winston.info({message: "TEST: check other module parameters are correct"});
			done();
		}, 500);
	})

/*
    // 10 RQNP
    //
	it("RQNP test", function (done) {
		winston.info({message: 'TEST: BEGIN RQNP test'});
        msgData = cbusLib.encodeRQNP();
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(messagesIn[0].length).to.equal(24), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('EF'), 'opcode';
            module.NVcount = cbusLib.decode(messagesIn[0]).param6
            winston.info({message: "TEST: node variable count received: " + module.NVcount});
            winston.info({message: "TEST: check other module parameters are correct"});
			done();
		}, 50);
	})
*/

    // 73 RQNPN - read number of parameters
    //
	it("RQNPN test", function (done) {
		winston.info({message: 'TEST: BEGIN RQNPN test'});
        msgData = cbusLib.encodeRQNPN(module.nodeNumber, 6);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(messagesIn[0].length).to.equal(18), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('9B'), 'opcode';
            module.NVcount = cbusLib.decode(messagesIn[0]).parameterValue
            winston.info({message: "TEST: node variable count received: " + module.NVcount});
            winston.info({message: "TEST: check other module parameters are correct"});
			done();
		}, 50);
	})


	function GetTestCase_NVWR () {
		var testCases = [];
        for (NVvalue = 1; NVvalue < 4; NVvalue++) {
            if (NVvalue == 1) nvValue = 0;
            if (NVvalue == 2) nvValue = 1;
            if (NVvalue == 3) nvValue = 255;
            testCases.push({'nvValue':nvValue});
        }
		return testCases;
	}


	itParam("NV1 write/read test nvValue ${value.nvValue}", GetTestCase_NVWR(), function (done, value) {
		winston.info({message: 'TEST: BEGIN NV1 write/read test : NV Index: 1 NV value: ' + value.nvValue});
        msgData = cbusLib.encodeNVSET(module.nodeNumber, 1, value.nvValue);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('59'), 'WRACK opcode';
			//
            msgData = cbusLib.encodeNVRD(module.nodeNumber, 1);
            cbusTransmit(msgData)
            setTimeout(function(){
                expect(messagesIn.length).to.equal(2), 'returned message count';
                expect(cbusLib.decode(messagesIn[1]).opCode).to.equal('97'), 'NVANS opcode';
                expect(cbusLib.decode(messagesIn[1]).nodeVariableValue).to.equal(value.nvValue), 'NV value';
                done();
            }, 50);
		}, 50);
	})

	itParam("NVMax write/read test nvValue ${value.nvValue}", GetTestCase_NVWR(), function (done, value) {
		winston.info({message: 'TEST: BEGIN NVMax write/read test : NV Index: ' + module.NVcount + ' NV value: ' + value.nvValue});
        msgData = cbusLib.encodeNVSET(module.nodeNumber, module.NVcount, value.nvValue);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('59'), 'WRACK opcode';
			//
            msgData = cbusLib.encodeNVRD(module.nodeNumber, module.NVcount);
            cbusTransmit(msgData)
            setTimeout(function(){
                expect(messagesIn.length).to.equal(2), 'returned message count';
                expect(cbusLib.decode(messagesIn[1]).opCode).to.equal('97'), 'NVANS opcode';
                done();
            }, 50);
		}, 50);
	})

	itParam("NV out of bounds write/read test nvValue ${value.nvValue}", GetTestCase_NVWR(), function (done, value) {
		winston.info({message: 'TEST: BEGIN NV out of bounds write/read test : NV Index: ' + (module.NVcount + 1) + ' NV value ' + value.nvValue});
        msgData = cbusLib.encodeNVSET(module.nodeNumber, module.NVcount+1, value.nvValue);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).to.equal(1), 'returned message count';
            expect(cbusLib.decode(messagesIn[0]).opCode).to.equal('6F'), 'ERR opcode';
			//
            msgData = cbusLib.encodeNVRD(module.nodeNumber, module.NVcount+1);
            cbusTransmit(msgData)
            setTimeout(function(){
                expect(messagesIn.length).to.equal(2), 'returned message count';
                expect(cbusLib.decode(messagesIn[1]).opCode).to.equal('6F'), 'ERR opcode';
                done();
            }, 50);
		}, 50);
	})

})