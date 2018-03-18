import nodeExternals from 'webpack-node-externals';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HardSourceWebpackPlugin from 'hard-source-webpack-plugin';
import CleanWebpackPlugin from 'clean-webpack-plugin';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import {join} from 'path';

const config = [
	{
		target: 'node',
		devtool: 'eval-source-map',
		externals: [nodeExternals()],
		entry: {
			main: './index.js',
		},
		output: {
			path: __dirname,
			filename: '[name].bundle.js',
			libraryTarget: 'commonjs2'
		},
		module: {
			rules: [{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							['env', {
								'targets': {
									'node': 'current'
								}, modules: false
							}]
						]
					}
				}
			}]
		},
		plugins: [
			new HardSourceWebpackPlugin({
				// Either an absolute path or relative to webpack's options.context.
				cacheDirectory: join(__dirname, 'node_modules/.cache/hard-source-node/[confighash]'),
				// Either false, a string, an object, or a project hashing function.
				environmentHash: {
					root: process.cwd(),
					directories: [],
					files: ['yarn.lock'],
				},
			})
		]
	},
	{
		entry: {
			main: './web/standardPage.js'
		},
		devtool: 'source-map',
		output: {
			filename: '[name].bundle.js',
			path: __dirname + '/dist'
		},
		module: {
			rules: [
				{
					test: /\.(scss|sass|css)$/,
					// this handles .scss translation
					use: [
						{loader: 'style-loader'},
						//MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
							options: {
								sourceMap: true,
								//minimize: true
							}
						},
						{
							loader: 'sass-loader',
							options: {
								sourceMap: true,
								//minimize: true
							}
						}
					]
				},
				{
					test: /\.(png|jpg|gif|svg)$/,
					use: [
						{
							loader: 'url-loader',
							options: {
								limit: 8192,
								outputPath: "img",
								publicPath: '/',
								useRelativePath: false
							}
						}
					]
				},
				{
					test: /\.(ttf|eot|woff2?)$/,
					use: [
						{
							loader: 'url-loader',
							options: {
								limit: 8192,
								outputPath: "fonts",
								publicPath: '/',
								useRelativePath: false
							}
						}
					]
				}
			]
		},
		plugins: [
			/*new UglifyJsPlugin({
				test: /\.js($|\?)/i,
				sourceMap: true
			}),*/
			// this handles the bundled .css output file
			new MiniCssExtractPlugin({
				filename: 'css/[name].css',
				path: __dirname + '/dist/css'
			}),
			new HardSourceWebpackPlugin({
				// Either an absolute path or relative to webpack's options.context.
				cacheDirectory: join(__dirname, 'node_modules/.cache/hard-source-browser/[confighash]'),
				// Either false, a string, an object, or a project hashing function.
				environmentHash: {
					root: process.cwd(),
					directories: [],
					files: ['yarn.lock'],
				},
			})
		]
	}
];

export default config