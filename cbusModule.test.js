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
});



beforeEach (function() {
    messagesIn = [];
    // ensure expected CAN header is reset before each test run
    cbusLib.setCanHeader(2, 60)
    winston.info({message: ' '});   // blank line to separate tests
})


afterAll((done) => {
    testClient.end()
    winston.info({message: ' '});                       // blank line to separate tests
    winston.info({message: 'TEST: tests finished '});
    setTimeout(function(){
        done();
    }, 100);
});


test("Dummy test", () => {
    expect('1').toBe('1');
});