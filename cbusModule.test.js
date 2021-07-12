var winston = require('./config/winston.js');
const net = require('net')
const io = require('socket.io-client');
var cbusLib = require('cbusLibrary')

const NET_PORT = 5550;
const NET_ADDRESS = "127.0.0.1"

function decToHex(num, len) {return parseInt(num).toString(16).toUpperCase().padStart(len, '0');}

let testClient = undefined;
let messagesIn = []
let WarningCount = 0;

beforeAll(() => {
		winston.info({message: ' '});
		winston.info({message: '======================================================================'});
		winston.info({message: '---------------------------- cbus test suite -------------------------'});
		winston.info({message: '======================================================================'});
        winston.info({message: `\u001b[31m1 \u001b[32m2 \u001b[33m3 \u001b[34m4 \u001b[35m5 \u001b[36m6 \u001b[37m7 \u001b[0m`});
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
    winston.info({message: `\u001b[36;1mTEST: ${WarningCount} Warnings found\u001b[0m`});
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


// ========================
//
// Start of actual tests
//
// ========================


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
		}, 200);
	})


var module = {
    "nodeNumber": null,
    "parameterCount":null,          // parameter 0
    "manufacturerId":null,          // parameter 1
    "minorCodeVersion":null,        // parameter 2
    "moduleId":null,                // parameter 3
    "eventCount":null,              // parameter 4
    "eventVariableCount":null,      // parameter 5
    "NVcount": null,                // parameter 6
    "majorVersion": null,           // parameter 7
    "nodeFlags": null               // parameter 8
}


    // RQNPN test
    //
    test.each`
    input
    ${0}
    ${1}
    ${2}
    ${3}
    ${4}
    ${5}    
    ${6}
    ${7}
    ${8}
    // add new test cases here
    `(`RQNPN $input test`, ({ input}, done) => {
		winston.debug({message: `TEST: BEGIN RQNPN ${input} test`});
        msgData = cbusLib.encodeRQNPN(module.nodeNumber, input);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(messagesIn[0].length).toBe(18), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('9B'), 'opcode';
            if (input == 0) { module.parameterCount = cbusLib.decode(messagesIn[0]).parameterValue 
                winston.info({message: "TEST: node parameter count received: " + module.parameterCount});}
            if (input == 4) { module.eventCount = cbusLib.decode(messagesIn[0]).parameterValue 
                winston.info({message: "TEST: node event count received: " + module.eventCount});}
            if (input == 6) { module.NVcount = cbusLib.decode(messagesIn[0]).parameterValue 
                winston.info({message: "TEST: node variable count received: " + module.NVcount});}
			done();
		}, 50);
	})


    // RQNPN Max test
    //
	test("RQNPN Max test", function (done) {
		winston.debug({message: 'TEST: BEGIN RQNPN Max test'});
        msgData = cbusLib.encodeRQNPN(module.nodeNumber, module.parameterCount);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(messagesIn[0].length).toBe(18), 'message length';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('9B'), 'opcode';
			done();
		}, 50);
	})


    // RQNPN Out of Bounds test
    //
	test("RQNPN Out of Bounds test", function (done) {
		winston.debug({message: 'TEST: BEGIN RQNPN Out of Bounds test'});
        msgData = cbusLib.encodeRQNPN(module.nodeNumber, module.parameterCount + 1);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length != 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: RQNPN out of bounds test failed : Parameter Index: ${module.parameterCount + 1}\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(messagesIn[0].length).toBe(18), 'message length';
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('9B'), 'opcode';
            }
			done();
		}, 50);
	})


  test.each`
    input   | expectedResult
    ${0}    | ${0}
    ${1}    | ${1}
    ${255}    | ${255}
    // add new test cases here
  `('NVSET/NVRD/WRACK NV1 test : nvValue $input', ({ input, expectedResult}, done) => {
    expect(input).toBe(expectedResult)
	winston.debug({message: `TEST: BEGIN NV1 write/read test : NV Index: 1 NV value: ${input}`});
    messagesIn = [];
    msgData = cbusLib.encodeNVSET(module.nodeNumber, 1, input);
    cbusTransmit(msgData)
    setTimeout(function(){
        expect(messagesIn.length).toBe(1), 'returned message count';
        expect(cbusLib.decode(messagesIn[0]).opCode).toBe('59'), 'WRACK opcode';
        //
        msgData = cbusLib.encodeNVRD(module.nodeNumber, 1);
        cbusTransmit(msgData)
        setTimeout(function(){
            expect(messagesIn.length).toBe(2), 'returned message count';
            expect(cbusLib.decode(messagesIn[1]).opCode).toBe('97'), 'NVANS opcode';
            expect(cbusLib.decode(messagesIn[1]).nodeVariableValue).toBe(expectedResult), 'NV value';
            done();
        }, 50);
    }, 50);
  })


  test.each`
    input   | expectedResult
    ${0}    | ${0}
    ${1}    | ${1}
    ${255}    | ${255}
    // add new test cases here
  `(`NVSET/NVRD/WRACK NVmax test : nvValue $input`, ({ input, expectedResult}, done) => {
    expect(input).toBe(expectedResult)
	winston.debug({message: `TEST: BEGIN NVmax write/read test : NV Index: ${module.NVcount} NV value: ${input}`});
    messagesIn = [];
    msgData = cbusLib.encodeNVSET(module.nodeNumber, module.NVcount, input);
    cbusTransmit(msgData)
    setTimeout(function(){
        expect(messagesIn.length).toBe(1), 'returned message count';
        expect(cbusLib.decode(messagesIn[0]).opCode).toBe('59'), 'WRACK opcode';
        //
        msgData = cbusLib.encodeNVRD(module.nodeNumber, module.NVcount);
        cbusTransmit(msgData)
        setTimeout(function(){
            expect(messagesIn.length).toBe(2), 'returned message count';
            expect(cbusLib.decode(messagesIn[1]).opCode).toBe('97'), 'NVANS opcode';
            expect(cbusLib.decode(messagesIn[1]).nodeVariableValue).toBe(expectedResult), 'NV value';
            done();
        }, 50);
    }, 50);
  })


  test.each`
    input   | expectedResult
    ${0}    | ${0}
    ${1}    | ${1}
    ${255}    | ${255}
    // add new test cases here
  `("NVSET/ERR NV Write out of bounds test nvValue $input", ({ input, expectedResult}, done) => {
		winston.debug({message: `TEST: BEGIN NV Write out of bounds test : NV Index: ${module.NVcount + 1} NV value ${input}`});
        msgData = cbusLib.encodeNVSET(module.nodeNumber, module.NVcount+1, input);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length < 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: NV Write out of bounds test failed : NV Index: ${module.NVcount + 1}\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(messagesIn.length).toBe(1), 'returned message count';
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('6F'), 'CMDERR opcode';
            }
            done();
		}, 50);
	})

  test.each`
    input   | expectedResult
    ${0}    | ${0}
    ${1}    | ${1}
    ${255}    | ${255}
    // add new test cases here
  `("NVRD NV Read out of bounds test nvValue $input", ({ input, expectedResult}, done) => {
		winston.debug({message: `TEST: BEGIN NV Read out of bounds test : NV Index: ${module.NVcount + 1} NV value ${input}`});
        msgData = cbusLib.encodeNVRD(module.nodeNumber, module.NVcount+1);
        cbusTransmit(msgData)
        setTimeout(function(){
            if (messagesIn.length < 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: NV Read out of bounds test failed : NV Index: ${module.NVcount + 1}\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('6F'), 'CMDERR opcode';
            }
            done();
        }, 50);
	})


    // NENRD EV 1 test
    //
	test("NENRD EV1 test", function (done) {
		winston.debug({message: 'TEST: BEGIN NENRD EV1 test'});
        msgData = cbusLib.encodeNENRD(module.nodeNumber, 1);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('F2'), 'ENRSP opcode';
//            expect(cbusLib.decode(messagesIn[0]).nodeVariableValue).toBe(expectedResult), 'NV value';
			done();
		}, 50);
	})


    // NENRD EV Max test
    //
	test.skip("NENRD Max test", function (done) {
		winston.debug({message: 'TEST: BEGIN NENRD Max test'});
        msgData = cbusLib.encodeNENRD(module.nodeNumber, module.eventCount);
        cbusTransmit(msgData)
		setTimeout(function(){
            expect(messagesIn.length).toBe(1), 'returned message count';
            expect(cbusLib.decode(messagesIn[0]).opCode).toBe('F2'), 'ENRSP opcode';
//            expect(cbusLib.decode(messagesIn[1]).nodeVariableValue).toBe(expectedResult), 'NV value';
			done();
		}, 50);
	})


    // NENRD EV out of bounds test
    //
	test("NENRD out of bounds test", function (done) {
		winston.debug({message: 'TEST: BEGIN NENRD out of bounds test'});
        msgData = cbusLib.encodeNENRD(module.nodeNumber, module.eventCount + 1);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length < 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: NENRD out of bounds test failed : EV Index: ${module.eventCount + 1}\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('6F'), 'CMDERR opcode';
            }
			done();
		}, 50);
	})



    // NNLRN change to learn mode test
    //
	test.skip("NNLRN test", function (done) {
		winston.debug({message: 'TEST: BEGIN NNLRN test'});
        msgData = cbusLib.encodeNNLRN(module.nodeNumber);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length != 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: NNLRN test failed\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(messagesIn[0].length).toBe(18), 'message length';
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('9B'), 'opcode';
            }
			done();
		}, 50);
	})



    // Event write Index 1 test
    //
	test("NNLRN/EVLRN/WRACK EV1 test", function (done) {
		winston.debug({message: 'TEST: BEGIN EV1 Write test'});
        // put module into learn mode
        msgData = cbusLib.encodeNNLRN(module.nodeNumber);
        cbusTransmit(msgData)
        // teach event - <0xD2><NN hi><NN lo><EN hi><EN lo> <EV#><EV val>
        msgData = cbusLib.encodeEVLRN(module.nodeNumber, 1, 1, 1);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length < 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: EV1 Write test failed\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(messagesIn[0].length).toBe(14), 'message length';
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('59'), 'WRACK opcode';
            }
			done();
		}, 50);
	})


    // Event write Max Index test
    //
	test("NNLRN/EVLRN/WRACK EVmax test", function (done) {
		winston.debug({message: 'TEST: BEGIN EVmax Write test'});
        // put module into learn mode
        msgData = cbusLib.encodeNNLRN(module.nodeNumber);
        cbusTransmit(msgData)
        // teach event - <0xD2><NN hi><NN lo><EN hi><EN lo> <EV#><EV val>
        msgData = cbusLib.encodeEVLRN(module.nodeNumber, module.eventCount, module.eventCount, 1);
        cbusTransmit(msgData)
		setTimeout(function(){
            if (messagesIn.length < 1) {
                winston.info({message: `\u001b[36;1mTEST: WARNING: EVmax Write test failed\u001b[0m`});
                WarningCount++;
            }
            else{
                expect(messagesIn[0].length).toBe(14), 'message length';
                expect(cbusLib.decode(messagesIn[0]).opCode).toBe('59'), 'WRACK opcode';
            }
			done();
		}, 50);
	})

  test.skip
/*  test.each`
    input   | expectedResult
    ${0}    | ${0}
    ${1}    | ${1}
    ${255}    | ${255}
    // add new test cases here
  `*/
  ("CANID test setting CAN Id $input", ({ input, expectedResult}, done) => {
		winston.debug({message: `TEST: BEGIN CANID test : CANID value ${input}`});
        msgData = cbusLib.encodeCANID(module.nodeNumber, input);
        cbusTransmit(msgData)
    setTimeout(function(){
        expect(messagesIn.length).toBe(1), 'returned message count';
        expect(cbusLib.decode(messagesIn[0]).opCode).toBe('59'), 'WRACK opcode';
        //
        msgData = cbusLib.encodeNVRD(module.nodeNumber, module.NVcount);
        cbusTransmit(msgData)
        setTimeout(function(){
            expect(messagesIn.length).toBe(2), 'returned message count';
            expect(cbusLib.decode(messagesIn[1]).opCode).toBe('97'), 'NVANS opcode';
            expect(cbusLib.decode(messagesIn[1]).nodeVariableValue).toBe(expectedResult), 'NV value';
            done();
        }, 50);
    }, 50);
	})




