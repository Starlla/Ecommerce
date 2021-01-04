const mongoose = require('mongoose')
const crypto = require('crypto')
const uuidv1 = require('uuid/v1')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    unique: 32
  },
  email: {
    type: String,
    trim: true,
    required: true,
    maxlength: 32
  },
  hashed_password: {
    type: String,
    required: true,
  },
  about: {
    type: String,
    trimed: true,
  },
  salt: String,
  role: {
    type: Number,
    default: 0
  },
  history: {
    type: Array,
    default: []
  }
},
  { timestamps: true }
)

userSchema.virtual('password')
  .set(function (password) {
    this._password = password
    this.salt = uuidv1()
    this.hashed_password = this.encryptyPassword(password)
  })
  .get(function () {
    return this._password
  })

userSchema.methods = {
  authenticate: function (plainText) {
    return this.encryptyPassword(plainText) === this.hashed_password;
  },

  encryptyPassword: function (password) {
    if (!password) return '';
    try {
      return crypto.createHash('sha1', this.salt)
        .update(password)
        .digest('hex')
    } catch (err) {
      return '';
    }
  }
}

module.exports = mongoose.model('User', userSchema);