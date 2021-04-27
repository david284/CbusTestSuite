var winston = require('./config/winston.js');
const net = require('net')
const io = require('socket.io-client');
var cbusLib = require('cbusLibrary')

const NET_PORT = 5550;
const NET_ADDRESS = "127.0.0.1"

function decToHex(num, len) {return parseInt(num).toString(16).toUpperCase().padStart(len, '0');}

let testClient = undefined;
let messagesIn = []

var module = {
    "nodeNumber": null,
    "NVcount": null
}



beforeAll(() => {
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
                winston.debug({message: 'TEST: Receive:  << ' + msgArray[msgIndex] + " " + cbusLib.decode(msgArray[msgIndex]).text});
                messagesIn.push(msgArray[msgIndex])
            }
        })
        
        testClient.on('end', function () {
            winston.debug({message: 'TEST: Client Disconnected at port ' + testClient.remotePort});
        });
			

        testClient.on('error', function(err) {
            winston.debug({message: 'TEST: Socket error ' + err});
        });
});



beforeEach (function() {
    messagesIn = [];
    // ensure expected CAN header is reset before each test run
    cbusLib.setCanHeader(2, 60)
    winston.debug({message: ' '});   // blank line to separate tests
})


afterAll((done) => {
    testClient.end()
    winston.debug({message: ' '});                       // blank line to separate tests
    winston.debug({message: 'TEST: tests finished '});
    setTimeout(function(){
        done();
    }, 100);
});

function cbusTransmit(msgData)
    {
        winston.debug({message: "TEST: Transmit: >> " + msgData + " " + cbusLib.decode(msgData).text});
        testClient.write(msgData);
    }



    test("Dummy test", () => {
        expect('1').toBe('1');
    });


    // 0D QNN
    //
	test("QNN test", function (done) {
		winston.debug({message: 'TEST: BEGIN QNN test'});
        msgData = cbusLib.encodeQNN();
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(messagesIn[0].length).toBe(20), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('B6'), 'opcode';
            module.nodeNumber = cbusLib.decode(messagesIn[0]).nodeNumber
            winston.debug({message: "TEST: nodeNumber received: " + module.nodeNumber});
            winston.debug({message: "TEST: check other module parameters are correct"});
			done();
		}, 100);
	})

    // 73 RQNPN - read number of parameters
    //
    test("RQNPN test", function (done) {
		winston.debug({message: 'TEST: BEGIN RQNPN test'});
        msgData = cbusLib.encodeRQNPN(module.nodeNumber, 6);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(messagesIn[0].length).toBe(18), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('9B'), 'opcode';
            module.NVcount = cbusLib.decode(messagesIn[0]).parameterValue
            winston.debug({message: "TEST: node variable count received: " + module.NVcount});
            winston.debug({message: "TEST: check other module parameters are correct"});
			done();
		}, 50);
	})


