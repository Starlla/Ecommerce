const express = require('express')
const router = express.Router();

const { signup } = require('../controllers/user');
const { useSignupValidator, userSignupValidator } = require("../validator");

router.post('/signup', userSignupValidator, signup);

module.exports = router;