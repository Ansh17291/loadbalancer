const UploadContent = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Upload Configuration</h2>
      
      <div className="bg-black p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Website Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Domain Name</label>
            <input 
              type="text" 
              placeholder="example.com" 
              className="w-full bg-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-2">SSL Certificate</label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Drop your SSL certificate here or click to upload</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Choose File
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2">Backend Servers (JSON)</label>
            <textarea 
              rows={6}
              placeholder={`[
  {"host": "192.168.1.100", "port": 8080},
  {"host": "192.168.1.101", "port": 8080}
]`}
              className="w-full bg-black border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
            Deploy Configuration
          </button>
        </div>
      </div>
    </div>
  );

  export default UploadContent;