// 开发模式
const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const config = {
    devtool: 'inline-source-map',
    entry: {
        index:'./src/main/main.js',
        'c-react':['react','react-dom'],
        'c-redux':['redux']
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        chunkFilename: '[name].chuck.js',
        publicPath: './', //配合chunkFilename使用 便于前端本地交互 直接使用跟目录
        path: path.resolve(__dirname, 'dist/'),  //
    },
    module: {
        rules: [{
                test: /\.(js|jsx)$/,
                use: {
                    loader: 'babel-loader',                    
                    options: {
                        presets: ['env', 'react','stage-0'],
                        plugins: [require('babel-plugin-transform-object-rest-spread')]
                    }
                },                
                include: [
                    path.join(__dirname, 'src')
                ],
                exclude: /(aaa)/
            },
            // css样式处理  后续扩展scss
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.less$/,
                use: [{
                    loader: "style-loader"
                }, {
                    loader: "css-loader"
                }, {
                    loader: "less-loader"
                }]
            },
            // 图片处理
            {
                test: /\.(png|jpg|gif)$/,
                use: [{
                    loader: 'url-loader',
                    options: {}
                }]
            },
            // 字体
            {
                test: /\.(woff|svg|eot|ttf)\??.*$/,
                loader: 'url-loader?limit=50000&name=[path][name].[ext]'
            }
        ]
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            names:['c-react','c-redux'],
            fileName:'[name].js'
        }),
        //自动生成HTML
        new HTMLWebpackPlugin({
            title: 'redux中间件学习',
            template:'./template.html' // 使用模版
        }),
        // jquery 全局插件 目前只为处理bootstrap
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        // 拷贝本地静态数据
        new CopyWebpackPlugin([
            {from:'./favicon.ico',to:'./favicon.ico'}], 
            {ignore: [],copyUnmodified: true,debug: 'debug'})
    ],
    resolve: {
        alias: {
            "frame":path.resolve(__dirname, './src/frame/frame.js'),
            "@":path.resolve(__dirname, './src/module/')
        }
    }  
};

module.exports = config;