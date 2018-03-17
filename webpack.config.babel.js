import nodeExternals from 'webpack-node-externals'

const config = {
	mode: 'development',
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
							},modules:false
						}]
					]
				}
			}
		}]
	}
};

export default [config]