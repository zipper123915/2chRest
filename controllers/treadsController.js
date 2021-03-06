const Treads = require('../models/treads');
const Boards = require('../models/boards');
const Comments = require('../models/comments');
const fs = require('fs');
const { getSocket } = require('../core/socket');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');


exports.getOne = async (req, res, next) => {
    const treadId = req.params.treadId;
    const tread = await Treads.findById(treadId).populate('comments');
    res.status(200).json(tread);
}

exports.create = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(422).json({
                errors: errors.array()
            });
            throw 'error';
        }
    
        
        const { title, text, imagesUrl } = req.body;
        const boardId = req.params.boardId;
        
        const tread = new Treads({
            title,
            text,
            imagesUrl,
            boardId
        });
        const dbTread = await tread.save();
        
        const board = await Boards.findById(boardId);
        board.treads.push(dbTread._id);
        await board.save();
        const token = jwt.sign({ accessId: dbTread._id }, 'zipper.TV4')
        
        res.status(201).json({
            token,
            tread: dbTread,
            message: 'Success'
        });
        let io = getSocket();
        io.emit('tread', dbTread);
        io = null;
    } catch (error) {
        throw new Error(error);
    }
}

exports.edit = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(422).json({
            errors: errors.array()
        });
        throw 'error';
    }
    
    const treadId = req.params.treadId;
    const { title, text, imagesUrl } = req.body;
    
    const tread = await Treads.findById(treadId).populate('comments');
    tread.title = title;
    tread.text = text;
    tread.imagesUrl = imagesUrl
    
    const upTread = await tread.save();
    
    res.status(200).json({
        tread: upTread,
        message: 'Success'
    });
    
    const io = getSocket();
    io.emit('upTread', upTread);
}

exports.delete = async (req, res, next) => {
    const treadId = req.params.treadId;
    
    const tread = await Treads.deleteID(treadId);
    tread.comments.forEach(comment => Comments.deleteID(comment))
    res.status(201).json({
        tread,
        message: 'Success'
    });
    const io = getSocket();
    io.emit('delTread', treadId);
}
