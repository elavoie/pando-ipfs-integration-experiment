#!/usr/bin/env python
import execo
import execo_g5k
# import itertools

print 'Submitting job request'
[(jobid, site)] = execo_g5k.oarsub([
    (execo_g5k.OarSubmission(resources="nodes=2"), "grenoble")
])

server_cmd = 'source ~/.bashrc && cd pando.js && node test/spawn-node.js'
worker_cmd = 'source ~/.bashrc && cd pando.js && node test/volunteer.js %s'

if jobid:
    try:
        print 'Waiting for job to start'
        execo_g5k.wait_oar_job_start(jobid, site)
        print 'Retrieving nodes'
        nodes = execo_g5k.get_oar_job_nodes(jobid, site)
        if (len(nodes) > 2):
            server = execo.Remote(
                    server_cmd,
                    nodes[0],
                    connection_params=execo_g5k.default_oarsh_oarcp_params)
            with server.start():
                execo.sleep(0.5)
                (p, i, m) = server.expect(r'^(\/ip4\/172.*)')
                execo.sleep(1)
                print m
                # workers = execo.Remote(
                #        worker_cmd,
                #        nodes[1:],
                #        connection_params=execo_g5k.default_oarsh_oarcp_params)
                print execo.Report([server]).to_string()
                print server.processes.stdout
        else:
            print 'Insufficient number of nodes'

    finally:
        execo_g5k.oardel([(jobid, site)])
