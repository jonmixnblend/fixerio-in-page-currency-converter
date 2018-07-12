const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const config = {
    mode: 'development',
    entry: ["babel-polyfill" ,path.resolve(__dirname, 'src/index.js')],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        hot: true
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        library: 'FixerIoInPageCurrencyConversion',
        publicPath: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [{
                use: 'babel-loader',
                test: /\.js$/,
                exclude: /node_modules/
            }
        ]
    }
};

module.exports = (env) => {

    if (env.mode === 'production') {
        config.devtool = 'source-map';
        config.plugins = [
            new UglifyJsPlugin()
        ];
        config.optimization = {
            minimize: true,
            minimizer: [new UglifyJsPlugin()]
        };
    }

    if (env.mode === 'development') {
        config.devtool = 'source-map';
        config.plugins = [
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: path.resolve(__dirname, 'index.html'),
                title: 'fixer.io inline currency converter.',
                inject: false
            }),
            new webpack.NamedModulesPlugin(),
            new webpack.HotModuleReplacementPlugin(),
            new UglifyJsPlugin({
                sourceMap: true
            }),
            new BundleAnalyzerPlugin()
        ];
        config.optimization = {
            minimize: true,
            minimizer: [new UglifyJsPlugin({
                sourceMap: true
            })]
        };
    }

    return config;
};