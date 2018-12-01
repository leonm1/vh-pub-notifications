const express = require('express');
const fetch = require('node-fetch');
const twilio = require('twilio')(process.env['TWILIO_SID'], process.env['TWILIO_AUTH']);
require('dotenv').config();

const app = express();

const awaitingOrders = new Map();
const API_URL = 'http://campusdining.vanderbilt.edu/?action=cmi_yoir&request=orderqueue_ajax&location_id=752';

app.post("/api/register", (req, res) => {
    const body = JSON.parse(req.body);

    if (body.phone && body.order && body.password) {
        if (body.password === process.env['LHD_PASSWORD']) {
            awaitingOrders.set(body.order, {
                orderNum: body.order,
                phoneNum: body.phone,
                time: new Date()
            })
        } else {
            res.send(403);
            return;
        }
    } else {
        res.send(400);
        return;
    }

    res.send(201);
    return;
});

const refreshOrders = async () => {
    const res = await fetch(API_URL);
    const orders = await res.json();

    orders.forEach(order => {
        const orderNum = order['order_id'];
        if (awaitingOrders.has(orderNum)) {
            sendText(awaitingOrders.get(orderNum));
            awaitingOrders.delete(orderNum);
        }
    });
}

const sendText = (order) => {
    return twilio.messages.create({
        body: `Your order, #${order.orderNum}, is ready!`,
        to: order.phoneNum,
        from: process.env['TWILIO_PHONE'],
    }); 
}

const clearOld = () => {
    const hourAgo = (new Date().getTime() / 1000) - 3600;
    awaitingOrders.forEach(order => {
        if (order.time.getTime() < hourAgo) {
            awaitingOrders.delete(order.orderNum);
        }
    });
}

setInterval(refreshOrders, 10000);
setInterval(clearOld, 7200);
app.listen(process.env['LHD_PORT'], console.log('Pub Notifications ready on port ' + process.env['LHD_PORT']))