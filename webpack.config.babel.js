import nodeExternals from 'webpack-node-externals';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const config = [
		{
			target: 'node',
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
			}
		}, {
			entry: {
				main: './standardPage.js'
			},
			output: {
				filename: '[name].js',
				path: __dirname + '/dist'
			},
			module: {
				rules: [
					{
						test: /\.(scss|sass|css)$/,
						// this handles .scss translation
						use: [
							MiniCssExtractPlugin.loader,
							{loader: 'css-loader'},
							{loader: 'sass-loader'}
						]
					},{
						test: /\.(png|jpg|gif|svg|ttf|eot|woff2?)$/,
						use: [
							{
								loader: 'url-loader',
								options: {
									limit: 8192
								}
							}
						]
					}
				]
			},
			plugins: [
				// this handles the bundled .css output file
				new MiniCssExtractPlugin({
					filename: 'css/[name].css',
					path: __dirname + '/dist/css'
				}),
			]
		}
	]
;

export default config